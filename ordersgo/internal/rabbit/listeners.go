package rabbit

import (
	"github.com/nmarsollier/commongo/log"
	"github.com/nmarsollier/ordersgo/internal/di"
)

func Init(deps di.Injector) {
	logger := deps.Logger().
		WithField(log.LOG_FIELD_CONTROLLER, "Rabbit").
		WithField(log.LOG_FIELD_RABBIT_ACTION, "Init")
	
	logger.Info("Iniciando consumers de RabbitMQ...")
	go listenArticleExist(logger)

	go listenLogout(logger)

	go listenPlaceOrder(logger)

	// Payment event consumers
	go listenPaymentSuccess(logger)

	go listenPaymentPartial(logger)

	go listenPaymentFailed(logger)

	go listenPaymentRefunded(logger)
}
