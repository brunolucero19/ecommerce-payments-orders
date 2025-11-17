package events

import (
	"context"

	"github.com/nmarsollier/commongo/db"
	"github.com/nmarsollier/commongo/log"
	"go.mongodb.org/mongo-driver/bson"
)

type EventsRepository interface {
	Insert(event *Event) (*Event, error)
	FindPlaceByCartId(cartId string) (*Event, error)
	FindByOrderId(orderId string) ([]*Event, error)
}

func NewEventsRepository(log log.LogRusEntry, collection db.Collection) EventsRepository {
	return &eventsRepository{
		log:        log,
		collection: collection,
	}
}

type eventsRepository struct {
	log        log.LogRusEntry
	collection db.Collection
}

func (r *eventsRepository) Insert(event *Event) (*Event, error) {
	if err := event.ValidateSchema(); err != nil {
		r.log.Error(err)
		return nil, err
	}

	if _, err := r.collection.InsertOne(context.Background(), event); err != nil {
		r.log.Error(err)
		return nil, err
	}

	return event, nil
}

// findPlaceByCartId lee un usuario desde la db
func (r *eventsRepository) FindPlaceByCartId(cartId string) (*Event, error) {
	event := &Event{}
	filter := bson.D{
		{Key: "$and",
			Value: bson.A{
				bson.M{"placeEvent.cartId": cartId},
				bson.M{"type": Place},
			},
		},
	}
	if err := r.collection.FindOne(context.Background(), filter, event); err != nil {
		if err.Error() != "mongo: no documents in result" {
			r.log.Error(err)
		}
		return nil, err
	}

	return event, nil
}

// FindAll devuelve todos los eventos por order id
func (r *eventsRepository) FindByOrderId(orderId string) ([]*Event, error) {
	filter := bson.M{"orderId": orderId}
	cur, err := r.collection.Find(context.Background(), filter)
	if err != nil {
		r.log.Error(err)
		return nil, err
	}
	defer cur.Close(context.Background())

	events := []*Event{}
	for cur.Next(context.Background()) {
		event := &Event{}
		if err := cur.Decode(event); err != nil {
			r.log.Error(err)
			return nil, err
		}
		events = append(events, event)
	}

	return events, nil
}
