package services

import (
	"github.com/nmarsollier/commongo/log"
	"github.com/nmarsollier/ordersgo/internal/events"
	"github.com/nmarsollier/ordersgo/internal/projections"
	"github.com/nmarsollier/ordersgo/internal/rabbit/rbschema"
)

type Service interface {
	ProcessArticleData(data *events.ValidationEvent) (*events.Event, error)
	PocessPlaceOrder(data *events.PlacedOrderData) (*events.Event, error)
	ProcessSavePayment(data *events.PaymentEvent) (*events.Event, error)
}

func NewService(log log.LogRusEntry, events events.EventService, projections projections.ProjectionsService, avPublihser rbschema.ArticleValidationPublisher, plPublisher rbschema.PlacedDataPublisher) Service {
	return &service{
		log:         log,
		events:      events,
		projections: projections,
		avPublihser: avPublihser,
		plPublisher: plPublisher,
	}
}

type service struct {
	log         log.LogRusEntry
	events      events.EventService
	projections projections.ProjectionsService
	avPublihser rbschema.ArticleValidationPublisher
	plPublisher rbschema.PlacedDataPublisher
}

func (s *service) ProcessArticleData(data *events.ValidationEvent) (*events.Event, error) {
	event, err := s.events.SaveArticleExist(data)
	if err != nil {
		return nil, err
	}

	go s.projections.Update(event.OrderId)

	return event, err
}

func (s *service) PocessPlaceOrder(data *events.PlacedOrderData) (*events.Event, error) {
	event, err := s.events.SavePlaceOrder(data)
	if err != nil {
		return nil, err
	}

	go s.projections.Update(event.OrderId)

	s.plPublisher.Logger().WithField(log.LOG_FIELD_CORRELATION_ID, s.log.CorrelationId())
	go s.plPublisher.Publish(toPlaceData(event))

	s.avPublihser.Logger().WithField(log.LOG_FIELD_CORRELATION_ID, s.log.CorrelationId())
	for _, article := range event.PlaceEvent.Articles {
		go s.avPublihser.PublishForResult(
			&rbschema.ArticleValidationData{
				ReferenceId: event.OrderId,
				ArticleId:   article.ArticleId,
			},
			"article_exist",
			"order_article_exist",
		)
	}

	return event, err
}

func (s *service) ProcessSavePayment(data *events.PaymentEvent) (*events.Event, error) {
	event, err := s.events.SavePayment(data)
	if err != nil {
		s.log.Error(err)
		return nil, err
	}

	go s.projections.Update(event.OrderId)

	return event, err
}

func toPlaceData(event *events.Event) *rbschema.OrderPlacedData {

	articles := make([]rbschema.ArticlePlacedData, len(event.PlaceEvent.Articles))
	for index, article := range event.PlaceEvent.Articles {
		articles[index] = rbschema.ArticlePlacedData{
			ArticleId: article.ArticleId,
			Quantity:  article.Quantity,
		}
	}

	return &rbschema.OrderPlacedData{
		OrderId:  event.OrderId,
		CartId:   event.PlaceEvent.CartId,
		UserId:   event.PlaceEvent.UserId,
		Articles: articles,
	}
}
