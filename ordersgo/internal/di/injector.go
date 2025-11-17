package di

import (
	"github.com/nmarsollier/commongo/db"
	"github.com/nmarsollier/commongo/httpx"
	"github.com/nmarsollier/commongo/log"
	"github.com/nmarsollier/commongo/rbt"
	"github.com/nmarsollier/commongo/security"
	"github.com/nmarsollier/ordersgo/internal/env"
	"github.com/nmarsollier/ordersgo/internal/events"
	"github.com/nmarsollier/ordersgo/internal/projections"
	"github.com/nmarsollier/ordersgo/internal/projections/order"
	"github.com/nmarsollier/ordersgo/internal/projections/status"
	"github.com/nmarsollier/ordersgo/internal/rabbit/rbschema"
	"github.com/nmarsollier/ordersgo/internal/services"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/x/mongo/driver/topology"
)

// Singletons
var database *mongo.Database
var httpClient httpx.HTTPClient
var eventsCollection db.Collection
var ordersCollection db.Collection
var statusCollection db.Collection

type Injector interface {
	Logger() log.LogRusEntry
	Database() *mongo.Database
	HttpClient() httpx.HTTPClient
	SecurityRepository() security.SecurityRepository
	SecurityService() security.SecurityService
	EventsCollection() db.Collection
	EventsRepository() events.EventsRepository
	EventService() events.EventService
	OrdersCollection() db.Collection
	OrdersRepository() order.OrderRepository
	OrderService() order.OrderService
	StatusCollection() db.Collection
	StatusRepository() status.StatusRepository
	StatusService() status.StatusService
	ProjectionsService() projections.ProjectionsService
	Service() services.Service
	ArticleValidationPublisher() rbschema.ArticleValidationPublisher
	PlacedOrderPublisher() rbschema.PlacedDataPublisher
}

type Deps struct {
	CurrLog         log.LogRusEntry
	CurrHttpClient  httpx.HTTPClient
	CurrDatabase    *mongo.Database
	CurrSecRepo     security.SecurityRepository
	CurrSecSvc      security.SecurityService
	CurrEvtColl     db.Collection
	CurrOrdColl     db.Collection
	CurrStaColl     db.Collection
	CurrEvtRepo     events.EventsRepository
	CurrOrdRepo     order.OrderRepository
	CurrOrdSvc      order.OrderService
	CurrEvtSvc      events.EventService
	CurrStsRepo     status.StatusRepository
	CurrStsSvc      status.StatusService
	CurrPrjSvc      projections.ProjectionsService
	CurrSvc         services.Service
	CurrAVPublisher rbschema.ArticleValidationPublisher
	CurrPLPublisher rbschema.PlacedDataPublisher
}

func NewInjector(log log.LogRusEntry) Injector {
	return &Deps{
		CurrLog: log,
	}
}

func (i *Deps) Logger() log.LogRusEntry {
	return i.CurrLog
}

func (i *Deps) Database() *mongo.Database {
	if i.CurrDatabase != nil {
		return i.CurrDatabase
	}

	if database != nil {
		return database
	}

	database, err := db.NewDatabase(env.Get().MongoURL, "orders")
	if err != nil {
		i.CurrLog.Fatal(err)
		return nil
	}

	return database
}

func (i *Deps) HttpClient() httpx.HTTPClient {
	if i.CurrHttpClient != nil {
		return i.CurrHttpClient
	}

	if httpClient != nil {
		return httpClient
	}

	httpClient = httpx.Get()
	return httpClient
}

func (i *Deps) SecurityRepository() security.SecurityRepository {
	if i.CurrSecRepo != nil {
		return i.CurrSecRepo
	}
	i.CurrSecRepo = security.NewSecurityRepository(i.Logger(), i.HttpClient(), env.Get().SecurityServerURL)
	return i.CurrSecRepo
}

func (i *Deps) SecurityService() security.SecurityService {
	if i.CurrSecSvc != nil {
		return i.CurrSecSvc
	}
	i.CurrSecSvc = security.NewSecurityService(i.Logger(), i.SecurityRepository())
	return i.CurrSecSvc
}

func (i *Deps) EventsCollection() db.Collection {
	if i.CurrEvtColl != nil {
		return i.CurrEvtColl
	}

	if eventsCollection != nil {
		return eventsCollection
	}

	cartCollection, err := db.NewCollection(i.CurrLog, i.Database(), "events", IsDbTimeoutError, "orderId")
	if err != nil {
		i.CurrLog.Fatal(err)
		return nil
	}
	return cartCollection
}

func (i *Deps) EventsRepository() events.EventsRepository {
	if i.CurrEvtRepo != nil {
		return i.CurrEvtRepo
	}
	i.CurrEvtRepo = events.NewEventsRepository(i.Logger(), i.EventsCollection())
	return i.CurrEvtRepo
}

func (i *Deps) EventService() events.EventService {
	if i.CurrEvtSvc != nil {
		return i.CurrEvtSvc
	}
	i.CurrEvtSvc = events.NewEventService(i.Logger(), i.EventsRepository())
	return i.CurrEvtSvc
}

func (i *Deps) OrdersCollection() db.Collection {
	if i.CurrOrdColl != nil {
		return i.CurrOrdColl
	}

	if ordersCollection != nil {
		return ordersCollection
	}

	cartCollection, err := db.NewCollection(i.CurrLog, i.Database(), "order_projection", IsDbTimeoutError, "orderId")
	if err != nil {
		i.CurrLog.Fatal(err)
		return nil
	}
	return cartCollection
}

func (i *Deps) StatusCollection() db.Collection {
	if i.CurrStaColl != nil {
		return i.CurrStaColl
	}

	if statusCollection != nil {
		return statusCollection
	}

	cartCollection, err := db.NewCollection(i.CurrLog, i.Database(), "status_projection", IsDbTimeoutError, "orderId")
	if err != nil {
		i.CurrLog.Fatal(err)
		return nil
	}
	return cartCollection
}

func (i *Deps) OrdersRepository() order.OrderRepository {
	if i.CurrOrdRepo != nil {
		return i.CurrOrdRepo
	}
	i.CurrOrdRepo = order.NewOrderRepository(i.Logger(), i.OrdersCollection())
	return i.CurrOrdRepo
}

func (i *Deps) StatusRepository() status.StatusRepository {
	if i.CurrStsRepo != nil {
		return i.CurrStsRepo
	}
	i.CurrStsRepo = status.NewStatusRepository(i.Logger(), i.StatusCollection())
	return i.CurrStsRepo
}

func (i *Deps) OrderService() order.OrderService {
	if i.CurrOrdSvc != nil {
		return i.CurrOrdSvc
	}
	i.CurrOrdSvc = order.NewOrderService(i.Logger(), i.OrdersRepository())
	return i.CurrOrdSvc
}

func (i *Deps) StatusService() status.StatusService {
	if i.CurrStsSvc != nil {
		return i.CurrStsSvc
	}
	i.CurrStsSvc = status.NewStatusService(i.Logger(), i.StatusRepository())
	return i.CurrStsSvc
}

func (i *Deps) ProjectionsService() projections.ProjectionsService {
	if i.CurrPrjSvc != nil {
		return i.CurrPrjSvc
	}
	i.CurrPrjSvc = projections.NewProjectionsService(i.Logger(), i.EventService(), i.OrderService(), i.StatusService())
	return i.CurrPrjSvc
}

func (i *Deps) Service() services.Service {
	if i.CurrSvc != nil {
		return i.CurrSvc
	}
	i.CurrSvc = services.NewService(i.Logger(), i.EventService(), i.ProjectionsService(), i.ArticleValidationPublisher(), i.PlacedOrderPublisher())
	return i.CurrSvc
}

func (i *Deps) ArticleValidationPublisher() rbschema.ArticleValidationPublisher {
	if i.CurrAVPublisher != nil {
		return i.CurrAVPublisher
	}

	i.CurrAVPublisher, _ = rbt.NewRabbitPublisher[*rbschema.ArticleValidationData](
		rbt.RbtLogger(env.Get().FluentURL, env.Get().ServerName, i.Logger().CorrelationId()),
		env.Get().RabbitURL,
		"article_exist",
		"direct",
		"article_exist",
	)

	return i.CurrAVPublisher

}
func (i *Deps) PlacedOrderPublisher() rbschema.PlacedDataPublisher {
	if i.CurrPLPublisher != nil {
		return i.CurrPLPublisher
	}

	i.CurrPLPublisher, _ = rbt.NewRabbitPublisher[*rbschema.OrderPlacedData](
		rbt.RbtLogger(env.Get().FluentURL, env.Get().ServerName, i.Logger().CorrelationId()),
		env.Get().RabbitURL,
		"order_placed",
		"fanout",
		"",
	)

	return i.CurrPLPublisher
}

func IsDbTimeoutError(err error) {
	if err == topology.ErrServerSelectionTimeout {
		database = nil
		eventsCollection = nil
		ordersCollection = nil
		statusCollection = nil
	}
}
