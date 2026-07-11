package upload

import (
	"crypto/md5"
	"encoding/hex"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// LocalUploader 本地存储上传器
type LocalUploader struct {
	basePath     string
	urlPrefix    string
	maxSize      int64
	allowedTypes []string
}

// NewLocalUploader 创建本地上传器
func NewLocalUploader(basePath, urlPrefix string, maxSize int64, allowedTypes []string) *LocalUploader {
	return &LocalUploader{
		basePath:     basePath,
		urlPrefix:    urlPrefix,
		maxSize:      maxSize,
		allowedTypes: allowedTypes,
	}
}

// Upload 上传文件
func (u *LocalUploader) Upload(file *multipart.FileHeader, subPath string) (string, error) {
	if err := u.ValidateFile(file); err != nil {
		return "", err
	}

	src, err := file.Open()
	if err != nil {
		return "", ErrUploadFailed
	}
	defer src.Close()

	filename := u.generateFilename(file.Filename)

	fullSubPath, err := safeLocalPath(u.basePath, subPath)
	if err != nil {
		return "", err
	}
	if err := os.MkdirAll(fullSubPath, 0755); err != nil {
		return "", ErrUploadFailed
	}

	filePath := filepath.Join(fullSubPath, filename)

	dst, err := os.Create(filePath)
	if err != nil {
		return "", ErrUploadFailed
	}
	defer dst.Close()

	if _, err := io.Copy(dst, src); err != nil {
		return "", ErrUploadFailed
	}

	// 构建返回的 URL（支持完整 URL 和相对路径）
	urlPath := filepath.ToSlash(filepath.Join(subPath, filename))
	if u.urlPrefix == "" {
		return "/" + urlPath, nil
	}

	// 如果 urlPrefix 以 / 结尾，去掉末尾的 /
	prefix := u.urlPrefix
	if len(prefix) > 0 && prefix[len(prefix)-1] == '/' {
		prefix = prefix[:len(prefix)-1]
	}

	return prefix + "/" + urlPath, nil
}

// Delete 删除文件
func (u *LocalUploader) Delete(url string) error {
	if url == "" {
		return nil
	}

	if u.urlPrefix != "" && !strings.HasPrefix(url, u.urlPrefix) {
		// 只允许删除当前存储驱动生成的 URL。
		return ErrInvalidPath
	}
	relPath := strings.TrimPrefix(strings.TrimPrefix(url, u.urlPrefix), "/")
	filePath, err := safeLocalPath(u.basePath, relPath)
	if err != nil {
		return err
	}

	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		return nil
	}

	return os.Remove(filePath)
}

// ValidateFile 验证文件
func (u *LocalUploader) ValidateFile(file *multipart.FileHeader) error {
	return validateFileContent(file, u.maxSize, u.allowedTypes)
}

// generateFilename 生成唯一文件名
func (u *LocalUploader) generateFilename(originalFilename string) string {
	ext := filepath.Ext(originalFilename)

	timestamp := time.Now().Format("20060102150405")
	hash := md5.New()
	hash.Write([]byte(fmt.Sprintf("%s%d", originalFilename, time.Now().UnixNano())))
	hashString := hex.EncodeToString(hash.Sum(nil))[:8]

	return fmt.Sprintf("%s_%s%s", timestamp, hashString, ext)
}

// safeLocalPath 将相对路径限制在上传根目录内。
// 路径穿越或绝对路径会被拒绝，避免覆盖、读取或删除站外文件。
func safeLocalPath(basePath string, relativePath string) (string, error) {
	baseAbs, err := filepath.Abs(basePath)
	if err != nil {
		return "", ErrInvalidPath
	}
	candidate, err := filepath.Abs(filepath.Join(baseAbs, relativePath))
	if err != nil {
		return "", ErrInvalidPath
	}
	rel, err := filepath.Rel(baseAbs, candidate)
	if err != nil || rel == ".." || strings.HasPrefix(rel, ".."+string(filepath.Separator)) {
		return "", ErrInvalidPath
	}
	return candidate, nil
}
