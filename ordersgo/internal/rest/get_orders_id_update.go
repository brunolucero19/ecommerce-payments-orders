package rest

import (
	"github.com/gin-gonic/gin"
	"github.com/nmarsollier/ordersgo/internal/rest/server"
)

//	@Summary		Actualiza la proyeccion
//	@Description	Actualiza las proyecciones en caso que hayamos roto algo.
//	@Tags			Ordenes
//	@Accept			json
//	@Produce		json
//	@Param			Authorization	header	string	true	"Bearer {token}"
//	@Param			orderId			path	string	true	"ID de orden"
//	@Success		200				"No Content"
//	@Router			/orders/:orderId/update [get]
//
// Updates the Porjections
func initGetOdersIdUpdate(engine *gin.Engine) {
	engine.GET(
		"/orders/:orderId/update",
		server.ValidateAuthentication,
		updateOrderById,
	)
}

func updateOrderById(c *gin.Context) {
	orderId := c.Param("orderId")

	deps := server.GinDi(c)
	go deps.ProjectionsService().Update(orderId)

	c.JSON(200, "")
}
