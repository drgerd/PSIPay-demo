import type { Category, ProductsResponse } from "../types/contracts";
import { getLiveProducts } from "../services/liveData";

export async function getProducts(
  category: Category,
  query?: { from?: string; to?: string },
  options?: { skipCache?: boolean; months?: number }
): Promise<ProductsResponse> {
  return getLiveProducts(category, query, options);
}
