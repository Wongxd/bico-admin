package upload

import (
	"errors"
	"io"
	"mime/multipart"
	"net/http"
	"path/filepath"
	"strings"
)

var (
	ErrFileTooLarge    = errors.New("文件大小超过限制")
	ErrInvalidFileType = errors.New("不支持的文件类型")
	ErrUploadFailed    = errors.New("文件上传失败")
	ErrEmptyFile       = errors.New("文件内容为空")
	ErrInvalidPath     = errors.New("无效的文件路径")
)

var safeExtensions = map[string]map[string]struct{}{
	"image/jpeg":      {".jpg": {}, ".jpeg": {}},
	"image/png":       {".png": {}},
	"image/gif":       {".gif": {}},
	"image/webp":      {".webp": {}},
	"image/bmp":       {".bmp": {}},
	"image/tiff":      {".tif": {}, ".tiff": {}},
	"image/x-icon":    {".ico": {}},
	"video/mp4":       {".mp4": {}},
	"video/webm":      {".webm": {}},
	"application/ogg": {".ogg": {}, ".ogv": {}},
}

// Uploader 文件上传接口
type Uploader interface {
	// Upload 上传文件
	Upload(file *multipart.FileHeader, subPath string) (string, error)
	// Delete 删除文件
	Delete(url string) error
	// ValidateFile 验证文件
	ValidateFile(file *multipart.FileHeader) error
}

// Config 上传配置接口
type Config interface {
	GetDriver() string
	GetMaxSize() int64
	GetAllowedTypes() []string
}

// validateFileContent 校验文件大小、真实类型和扩展名。
// 类型以文件内容探测结果为准，禁止依赖客户端可伪造的请求头。
func validateFileContent(file *multipart.FileHeader, maxSize int64, allowedTypes []string) error {
	if file.Size <= 0 {
		return ErrEmptyFile
	}
	if file.Size > maxSize {
		return ErrFileTooLarge
	}

	src, err := file.Open()
	if err != nil {
		return ErrUploadFailed
	}
	defer src.Close()

	buffer := make([]byte, 512)
	n, err := src.Read(buffer)
	if err != nil && !errors.Is(err, io.EOF) {
		return ErrUploadFailed
	}
	if n == 0 {
		return ErrEmptyFile
	}

	detectedType := normalizeContentType(http.DetectContentType(buffer[:n]))
	if detectedType == "image/svg+xml" || strings.EqualFold(filepath.Ext(file.Filename), ".svg") {
		// SVG 可携带脚本，不能与后台站点同源托管。
		return ErrInvalidFileType
	}
	if !containsContentType(allowedTypes, detectedType) {
		return ErrInvalidFileType
	}
	if !extensionMatchesType(filepath.Ext(file.Filename), detectedType) {
		return ErrInvalidFileType
	}
	return nil
}

// normalizeContentType 去除参数并统一常见别名。
func normalizeContentType(contentType string) string {
	contentType = strings.ToLower(strings.TrimSpace(strings.Split(contentType, ";")[0]))
	if contentType == "image/jpg" {
		return "image/jpeg"
	}
	if contentType == "video/ogg" {
		return "application/ogg"
	}
	return contentType
}

// containsContentType 判断探测类型是否在配置白名单中。
func containsContentType(allowedTypes []string, detectedType string) bool {
	for _, allowedType := range allowedTypes {
		if normalizeContentType(allowedType) == detectedType {
			return true
		}
	}
	return false
}

// extensionMatchesType 校验扩展名与真实内容类型一致。
// 未显式登记的类型默认拒绝，避免新增类型时绕过安全约束。
func extensionMatchesType(extension string, detectedType string) bool {
	extensions, ok := safeExtensions[detectedType]
	if !ok {
		return false
	}
	_, ok = extensions[strings.ToLower(extension)]
	return ok
}
