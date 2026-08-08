// Server-side price list, generated from the static pages' RWCart.add()
// calls by scripts/build-catalog.mjs. Orders re-price against this — the
// client's prices are never trusted.
import catalogJson from "@/catalog/products.json";

export type CatalogProduct = {
  id: string;
  name: string;
  cat: string;
  price: number;
  image?: string;
};

const products = catalogJson as CatalogProduct[];

let _byId: Map<string, CatalogProduct> | null = null;

export function getProducts(): CatalogProduct[] {
  return products;
}

export function productById(id: string): CatalogProduct | undefined {
  if (!_byId) _byId = new Map(products.map((p) => [p.id, p]));
  return _byId.get(id);
}
