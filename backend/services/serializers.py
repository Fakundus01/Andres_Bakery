from __future__ import annotations

from ..models import Ingredient, Order, OrderDelivery, Payment, Product, ProductVariant, Tag, User


class Serializer:
    @staticmethod
    def user(user: User, *, include_created_at: bool = False) -> dict:
        payload = {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "is_admin": user.is_admin,
        }
        if include_created_at:
            # Una fila escrita fuera del ORM (un arreglo a mano, un import)
            # puede no tener fecha: eso no puede tumbar la lista entera.
            payload["created_at"] = user.created_at.isoformat() if user.created_at else None
        return payload

    @staticmethod
    def ingredient(ingredient: Ingredient) -> dict:
        return {
            "id": ingredient.id,
            "name": ingredient.name,
            "unit": ingredient.unit,
        }

    @staticmethod
    def tag(tag: Tag) -> dict:
        return {
            "id": tag.id,
            "name": tag.name,
            "slug": tag.slug,
            "color_token": tag.color_token,
            "sort_order": tag.sort_order,
        }

    @staticmethod
    def variant(variant: ProductVariant) -> dict:
        return {
            "id": variant.id,
            "name": variant.name,
            "price": float(variant.price),
        }

    @staticmethod
    def product(product: Product) -> dict:
        return {
            "id": product.id,
            "slug": product.slug,
            "name": product.name,
            "description": product.description,
            "steps": product.steps,
            "prep_note": product.prep_note,
            "price": float(product.price),
            "unit_label": product.unit_label,
            "min_qty": product.min_qty,
            "qty_step": product.qty_step,
            "category": product.category,
            "image_url": product.image_url,
            "available": product.available,
            "allows_pickup": product.allows_pickup,
            "allows_delivery": product.allows_delivery,
            "ingredients": [
                Serializer.ingredient(ingredient)
                for ingredient in product.ingredients
            ],
            "tags": [Serializer.tag(tag) for tag in product.tags],
            "variants": [Serializer.variant(variant) for variant in product.variants],
        }

    @staticmethod
    def delivery(delivery: OrderDelivery | None) -> dict | None:
        if not delivery:
            return None
        return {
            "customer_name": delivery.customer_name,
            "customer_email": delivery.customer_email,
            "customer_phone": delivery.customer_phone,
            "delivery_method": delivery.delivery_method,
            "address": delivery.address,
            "neighborhood": delivery.neighborhood,
            "city": delivery.city,
            "shipping_amount": float(delivery.shipping_amount),
            "notes": delivery.notes,
            "payment_method": delivery.payment_method,
        }

    @staticmethod
    def payment(payment: Payment) -> dict:
        return {
            "id": payment.id,
            "provider": payment.provider,
            "provider_payment_id": payment.provider_payment_id,
            "amount": float(payment.amount),
            "currency": payment.currency,
            "status": payment.status,
            "created_at": payment.created_at.isoformat(),
        }

    @staticmethod
    def order(order: Order) -> dict:
        return {
            "id": order.id,
            "user_id": order.user_id,
            "status": order.status,
            "channel": order.channel,
            "total_amount": float(order.total_amount),
            "created_at": order.created_at.isoformat(),
            # Un pedido de invitado no tiene usuario (ADR-012): los datos de
            # contacto estan en "delivery".
            "user": Serializer.user(order.user) if order.user else None,
            "items": [
                {
                    "id": item.id,
                    "product_id": item.product_id,
                    "quantity": item.quantity,
                    "unit_price": float(item.unit_price),
                    "product_name": item.product.name,
                }
                for item in order.items
            ],
            "delivery": Serializer.delivery(order.delivery),
            "payments": [Serializer.payment(payment) for payment in order.payments],
        }
