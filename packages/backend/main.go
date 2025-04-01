package main

import (
	"os"
	"strconv"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

	"github.com/rocker15962/llm-web-assistant/packages/backend/handlers"
	"github.com/rocker15962/llm-web-assistant/packages/backend/utils"
)

func main() {
	// 載入環境變數
	if err := godotenv.Load(); err != nil {
		utils.LogWarning("未找到 .env 檔案，使用環境變數")
	}

	// 設置 Gin 模式
	ginMode := os.Getenv("GIN_MODE")
	if ginMode != "" {
		gin.SetMode(ginMode)
	} else {
		gin.SetMode(gin.ReleaseMode)
	}

	// 創建 Gin 引擎
	r := gin.New()

	// 使用自定義中間件
	r.Use(gin.Recovery())
	r.Use(utils.LoggerMiddleware())

	// 配置 CORS
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// 設置路由
	r.GET("/api/health", handlers.HandleHealth)
	r.POST("/api/ask", handlers.HandleAsk)

	// 獲取端口
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080" // 默認端口
	}

	// 獲取調試模式
	debugMode := false
	debugStr := os.Getenv("DEBUG")
	if debugStr != "" {
		var err error
		debugMode, err = strconv.ParseBool(debugStr)
		if err != nil {
			utils.LogWarning("無法解析 DEBUG 環境變數，使用默認值 false")
		}
	}

	// 設置日誌級別
	if debugMode {
		utils.SetLogLevel(utils.LogLevelDebug)
		utils.LogDebug("調試模式已啟用")
	} else {
		utils.SetLogLevel(utils.LogLevelInfo)
	}

	// 啟動服務器
	utils.LogInfo("啟動服務器，監聽端口 %s", port)
	if err := r.Run(":" + port); err != nil {
		utils.LogFatal("啟動服務器失敗: %v", err)
	}
}
