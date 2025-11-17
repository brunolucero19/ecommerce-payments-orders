package status

import (
	"context"

	"github.com/nmarsollier/commongo/db"
	"github.com/nmarsollier/commongo/errs"
	"github.com/nmarsollier/commongo/log"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type StatusRepository interface {
	Insert(order *OrderStatus) (*OrderStatus, error)
	FindByOrderId(orderId string) (*OrderStatus, error)
}

func NewStatusRepository(log log.LogRusEntry, collection db.Collection) StatusRepository {
	return &statusRepository{
		log:        log,
		collection: collection,
	}
}

type statusRepository struct {
	log        log.LogRusEntry
	collection db.Collection
}

func (r *statusRepository) Insert(order *OrderStatus) (*OrderStatus, error) {
	if err := order.ValidateSchema(); err != nil {
		r.log.Error(err)
		return nil, err
	}

	filter := bson.M{"orderId": order.OrderId}
	updateOptions := options.Update().SetUpsert(true)
	document := upsertOrder{
		Set: order,
	}

	if _, err := r.collection.UpdateOne(context.Background(), filter, document, updateOptions); err != nil {
		r.log.Error(err)
		return nil, err
	}
	return order, nil
}

type upsertOrder struct {
	Set *OrderStatus `bson:"$set"`
}

func (r *statusRepository) FindByOrderId(orderId string) (*OrderStatus, error) {
	order := &OrderStatus{}
	filter := bson.M{"orderId": orderId}
	if err := r.collection.FindOne(context.Background(), filter, order); err != nil {
		if err.Error() == "mongo: no documents in result" {
			return nil, errs.NotFound
		}
		r.log.Error(err)
		return nil, err
	}

	return order, nil
}
