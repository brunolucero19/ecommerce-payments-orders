package rest

import (
	"fmt"

	"github.com/gin-gonic/gin"
	"github.com/nmarsollier/ordersgo/internal/env"
	"github.com/nmarsollier/ordersgo/internal/rest/server"
)

// Start this server
func Start() {
	engine := server.Router()
	initRoutes(engine)
	engine.Run(fmt.Sprintf(":%d", env.Get().Port))
}

func initRoutes(engine *gin.Engine) {
	initGetPrdersId(engine)
	initGetOdersIdUpdate(engine)
	initGetOrders(engine)
	initPostPayment(engine)
}
