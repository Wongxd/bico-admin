package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

// TestCORSAllowsConfiguredOrigin 验证白名单来源获得跨域响应头。
func TestCORSAllowsConfiguredOrigin(t *testing.T) {
	gin.SetMode(gin.TestMode)
	engine := gin.New()
	engine.Use(CORS([]string{"https://admin.example.com"}))
	engine.GET("/test", func(c *gin.Context) {
		// 测试处理器仅用于确认请求通过中间件。
		c.Status(http.StatusNoContent)
	})

	request := httptest.NewRequest(http.MethodGet, "/test", nil)
	request.Header.Set("Origin", "https://admin.example.com")
	response := httptest.NewRecorder()
	engine.ServeHTTP(response, request)

	if response.Header().Get("Access-Control-Allow-Origin") != "https://admin.example.com" {
		// 白名单来源缺少授权头会导致浏览器拦截响应。
		t.Fatalf("白名单来源未获授权")
	}
}

// TestCORSRejectsUnknownPreflight 验证未知来源的预检请求被拒绝。
func TestCORSRejectsUnknownPreflight(t *testing.T) {
	gin.SetMode(gin.TestMode)
	engine := gin.New()
	engine.Use(CORS([]string{"https://admin.example.com"}))
	engine.OPTIONS("/test", func(c *gin.Context) {
		// 未知来源不应到达业务处理器。
		c.Status(http.StatusNoContent)
	})

	request := httptest.NewRequest(http.MethodOptions, "/test", nil)
	request.Header.Set("Origin", "https://evil.example.com")
	response := httptest.NewRecorder()
	engine.ServeHTTP(response, request)

	if response.Code != http.StatusForbidden {
		// 预检放行会扩大生产跨域范围。
		t.Fatalf("未知来源状态码错误: %d", response.Code)
	}
}
