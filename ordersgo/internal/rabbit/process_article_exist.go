package rabbit

import (
	"time"

	"github.com/nmarsollier/commongo/log"
	"github.com/nmarsollier/commongo/rbt"
	"github.com/nmarsollier/ordersgo/internal/di"
	"github.com/nmarsollier/ordersgo/internal/env"
	"github.com/nmarsollier/ordersgo/internal/events"
)

//	@Summary		Mensage Rabbit article_exist/order_article_exist
//	@Description	Antes de iniciar las operaciones se validan los artículos contra el catalogo.
//	@Tags			Rabbit
//	@Accept			json
//	@Produce		json
//	@Param			article_exist	body	rbt.InputMessage[events.ValidationEvent]	true	"Consume article_exist/order_article_exist"
//	@Router			/rabbit/article_exist [get]
//
// Validar Artículos
func listenArticleExist(logger log.LogRusEntry) {
	for {
		err := rbt.ConsumeRabbitEvent[events.ValidationEvent](
			env.Get().FluentURL,
			env.Get().RabbitURL,
			env.Get().ServerName,
			"article_exist",
			"direct",
			"order_article_exist",
			"order_article_exist",
			processArticleExist,
		)

		if err != nil {
			logger.Error(err)
		}
		logger.Info("RabbitMQ listenLogout conectando en 5 segundos.")
		time.Sleep(5 * time.Second)
	}
}

func processArticleExist(logger log.LogRusEntry, newMessage *rbt.InputMessage[events.ValidationEvent]) {
	deps := di.NewInjector(logger)

	_, err := deps.Service().ProcessArticleData(&newMessage.Message)
	if err != nil {
		deps.Logger().Error(err)
		return
	}
}
