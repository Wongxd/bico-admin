package upload

import (
	"bytes"
	"errors"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"
)

// TestValidateFileContentAcceptsRealPNG 验证真实图片可正常上传。
func TestValidateFileContentAcceptsRealPNG(t *testing.T) {
	file := buildFileHeader(t, "avatar.png", append([]byte("\x89PNG\r\n\x1a\n"), make([]byte, 64)...))

	if err := validateFileContent(file, 1024, []string{"image/png"}); err != nil {
		// 合法 PNG 被拒绝会破坏头像和富文本上传。
		t.Fatalf("合法 PNG 校验失败: %v", err)
	}
}

// TestValidateFileContentRejectsSpoofedType 验证伪造请求头无法绕过内容检测。
func TestValidateFileContentRejectsSpoofedType(t *testing.T) {
	file := buildFileHeader(t, "attack.png", []byte("<html><script>alert(1)</script></html>"))
	file.Header.Set("Content-Type", "image/png")

	err := validateFileContent(file, 1024, []string{"image/png"})
	if !errors.Is(err, ErrInvalidFileType) {
		// HTML 内容必须按真实类型拒绝。
		t.Fatalf("期望拒绝伪造类型，实际错误: %v", err)
	}
}

// TestValidateFileContentRejectsSVG 验证 SVG 不会进入同源静态目录。
func TestValidateFileContentRejectsSVG(t *testing.T) {
	file := buildFileHeader(t, "attack.svg", []byte(`<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>`))

	err := validateFileContent(file, 1024, []string{"image/svg+xml"})
	if !errors.Is(err, ErrInvalidFileType) {
		// SVG 即使被误加回白名单也必须拒绝。
		t.Fatalf("期望拒绝 SVG，实际错误: %v", err)
	}
}

// buildFileHeader 构造与真实 HTTP 上传一致的文件头。
func buildFileHeader(t *testing.T, filename string, content []byte) *multipart.FileHeader {
	t.Helper()
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile("file", filename)
	if err != nil {
		// multipart 字段创建失败时无法继续验证上传逻辑。
		t.Fatalf("创建上传字段失败: %v", err)
	}
	if _, err := part.Write(content); err != nil {
		// 内容未完整写入会让类型探测结果失真。
		t.Fatalf("写入上传内容失败: %v", err)
	}
	if err := writer.Close(); err != nil {
		// 结束边界缺失会导致请求解析失败。
		t.Fatalf("关闭 multipart 失败: %v", err)
	}

	request := httptest.NewRequest(http.MethodPost, "/upload", body)
	request.Header.Set("Content-Type", writer.FormDataContentType())
	if err := request.ParseMultipartForm(1024); err != nil {
		// 测试请求应与 Gin 接收的结构保持一致。
		t.Fatalf("解析 multipart 失败: %v", err)
	}
	return request.MultipartForm.File["file"][0]
}
