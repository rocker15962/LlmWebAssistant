package main

import (
	"log"
	"net/http"
	"os"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

	"llm-web-assistant/backend/config"
	"llm-web-assistant/backend/handlers"
)

func main() {
	// 載入環境變數
	if err := godotenv.Load(); err != nil {
		log.Println("警告: 無法載入 .env 文件")
	}

	// 設置 Gin 模式
	ginMode := os.Getenv("GIN_MODE")
	if ginMode != "" {
		gin.SetMode(ginMode)
	}

	// 創建 Gin 路由器
	r := gin.Default()

	// 添加錯誤恢復中間件，確保記錄所有錯誤
	r.Use(gin.Recovery())

	// 添加自定義錯誤處理中間件
	r.Use(func(c *gin.Context) {
		c.Next()

		// 檢查是否有錯誤
		if len(c.Errors) > 0 {
			for _, e := range c.Errors {
				log.Printf("錯誤: %v", e.Err)
			}
		}
	})

	// 配置 CORS
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// 設置 API 路由
	api := r.Group("/api")
	{
		api.GET("/health", handlers.HandleHealth)
		api.POST("/ask", handlers.HandleAsk)
	}

	// 獲取端口
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080" // 默認端口
	}

	// 啟動服務器
	log.Printf("服務器啟動在 http://localhost:%s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("無法啟動服務器: %v", err)
	}
}

// 載入環境變數
func loadEnv() {
	// 嘗試從 .env 文件載入環境變數
	envFile := ".env"
	if _, err := os.Stat(envFile); err == nil {
		if err := godotenv.Load(envFile); err != nil {
			log.Printf("警告: 無法載入 .env 文件: %v", err)
		}
	}

	// 確保必要的環境變數存在
	if os.Getenv("LLM_API_KEY") == "" {
		log.Println("警告: LLM_API_KEY 環境變數未設置")
	}
}

// 設置 API 路由
func setupRoutes(router *gin.Engine) {
	// 健康檢查
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// API 路由組
	api := router.Group("/api")
	{
		// LLM 問答端點
		api.POST("/ask", handlers.HandleAsk)
	}

	// 靜態文件服務（用於開發和測試）
	if !config.IsProduction() {
		router.Static("/static", "./static")
	}
}
