package main

import (
	"bytes"
	"context"
	"fmt"
	"io/fs"
	"log"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/joho/godotenv"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	s3types "github.com/aws/aws-sdk-go-v2/service/s3/types"
)

func collectFiles(root string) ([]string, error) {
	var files []string
	err := filepath.WalkDir(root, func(p string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			return nil
		}
		if d.Type().IsRegular() {
			files = append(files, p)
		}
		return nil
	})
	return files, err
}

func toKey(root, abs string) string {
	rel, err := filepath.Rel(root, abs)
	if err != nil {
		// fallback: use abs path
		return filepath.ToSlash(abs)
	}
	return filepath.ToSlash(rel)
}

func guessContentType(p string) string {
	ext := strings.ToLower(filepath.Ext(p))
	switch ext {
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".png":
		return "image/png"
	case ".gif":
		return "image/gif"
	case ".webp":
		return "image/webp"
	case ".svg":
		return "image/svg+xml"
	case ".mp4":
		return "video/mp4"
	case ".mov":
		return "video/quicktime"
	case ".pdf":
		return "application/pdf"
	case ".txt":
		return "text/plain"
	case ".html":
		return "text/html"
	case ".css":
		return "text/css"
	case ".js", ".mjs":
		return "application/javascript"
	case ".json":
		return "application/json"
	default:
		return "application/octet-stream"
	}
}

func main() {
	_ = godotenv.Load()

	uploadDir := strings.TrimSpace(os.Getenv("UPLOAD_DIR"))
	region := strings.TrimSpace(os.Getenv("WASABI_REGION"))
	endpoint := strings.TrimSpace(os.Getenv("WASABI_ENDPOINT"))
	bucket := strings.TrimSpace(os.Getenv("WASABI_BUCKET"))
	access := strings.TrimSpace(os.Getenv("WASABI_ACCESS_KEY"))
	secret := strings.TrimSpace(os.Getenv("WASABI_SECRET_KEY"))

	concurrency := 5
	if v := strings.TrimSpace(os.Getenv("CONCURRENCY")); v != "" {
		if c, err := strconv.Atoi(v); err == nil && c > 0 {
			concurrency = c
		}
	}

	if uploadDir == "" || bucket == "" || access == "" || secret == "" {
		log.Fatal("Env belum lengkap: UPLOAD_DIR, WASABI_BUCKET, WASABI_ACCESS_KEY, WASABI_SECRET_KEY wajib")
	}
	info, err := os.Stat(uploadDir)
	if err != nil || !info.IsDir() {
		log.Fatal("UPLOAD_DIR bukan sebuah folder yang valid")
	}

	ctx := context.Background()
	cfg, err := config.LoadDefaultConfig(ctx,
		config.WithRegion(region),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(access, secret, "")),
	)
	if err != nil {
		log.Fatalf("gagal load config: %v", err)
	}

	client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.UsePathStyle = true
		if endpoint != "" {
			// Set custom Wasabi endpoint
			o.EndpointResolver = s3.EndpointResolverFromURL(endpoint)
		}
	})

	files, err := collectFiles(uploadDir)
	if err != nil {
		log.Fatalf("gagal scan folder: %v", err)
	}
	fmt.Printf("Total file ditemukan: %d\n", len(files))

	var success int64
	var failed int64

	jobs := make(chan string)
	var wg sync.WaitGroup
	wg.Add(concurrency)

	start := time.Now()

	for i := 0; i < concurrency; i++ {
		go func() {
			defer wg.Done()
			for f := range jobs {
				key := toKey(uploadDir, f)
				body, err := os.ReadFile(f)
				if err != nil {
					atomic.AddInt64(&failed, 1)
					log.Printf("gagal baca %s: %v", key, err)
					continue
				}
				ct := guessContentType(f)
				_, err = client.PutObject(ctx, &s3.PutObjectInput{
					Bucket:       aws.String(bucket),
					Key:          aws.String(key),
					Body:         bytes.NewReader(body),
					ContentType:  aws.String(ct),
					CacheControl: aws.String("public, max-age=31536000"),
					ACL:          s3types.ObjectCannedACLPublicRead,
				})
				if err != nil {
					atomic.AddInt64(&failed, 1)
					log.Printf("Failed to upload %s: %v", key, err)
				} else {
					s := atomic.AddInt64(&success, 1)
					log.Printf("[%d/%d] Uploaded: %s", s, len(files), key)
				}
			}
		}()
	}

	go func() {
		for _, f := range files {
			jobs <- f
		}
		close(jobs)
	}()

	wg.Wait()
	dur := time.Since(start)
	fmt.Printf("Selesai. Berhasil: %d, Gagal: %d, Durasi: %s\n", success, failed, dur)
	if failed > 0 {
		os.Exit(1)
	}
}