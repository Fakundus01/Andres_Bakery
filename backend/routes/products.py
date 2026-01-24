from flask import Blueprint, jsonify, request

from ..extensions import db
from ..models import Product
from .utils import admin_required


bp = Blueprint("products", __name__, url_prefix="/api/products")


@bp.get("")
def list_products():
    products = Product.query.all()
    return jsonify(
        [
            {
                "id": product.id,
                "name": product.name,
                "description": product.description,
                "price": float(product.price),
                "category": product.category,
                "image_url": product.image_url,
                "available": product.available,
            }
            for product in products
        ]
    )


@bp.post("")
@admin_required
def create_product():
    data = request.get_json(silent=True) or {}
    name = data.get("name")
    price = data.get("price")

    if not name or price is None:
        return jsonify({"error": "name and price are required"}), 400

    product = Product(
        name=name,
        description=data.get("description"),
        price=price,
        category=data.get("category", "general"),
        image_url=data.get("image_url"),
        available=data.get("available", True),
    )
    db.session.add(product)
    db.session.commit()

    return jsonify({"id": product.id}), 201


@bp.get("/<int:product_id>")
def get_product(product_id: int):
    product = Product.query.get_or_404(product_id)
    return jsonify(
        {
            "id": product.id,
            "name": product.name,
            "description": product.description,
            "price": float(product.price),
            "category": product.category,
            "image_url": product.image_url,
            "available": product.available,
        }
    )


@bp.put("/<int:product_id>")
@admin_required
def update_product(product_id: int):
    product = Product.query.get_or_404(product_id)
    data = request.get_json(silent=True) or {}

    for field in ["name", "description", "category", "image_url", "available"]:
        if field in data:
            setattr(product, field, data[field])

    if "price" in data:
        product.price = data["price"]

    db.session.commit()
    return jsonify({"status": "updated"})


@bp.delete("/<int:product_id>")
@admin_required
def delete_product(product_id: int):
    product = Product.query.get_or_404(product_id)
    db.session.delete(product)
    db.session.commit()
    return jsonify({"status": "deleted"})
