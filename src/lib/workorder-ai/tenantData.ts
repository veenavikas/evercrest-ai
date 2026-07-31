import type { PropertyInfo, TenantInfo, TenantInfoFile } from "./types";
import tenantDataJson from "@/data/tenant_info.json";

export const defaultTenantInfo: TenantInfoFile = tenantDataJson as TenantInfoFile;

export function getCurrentTenant(data: TenantInfoFile = defaultTenantInfo, email?: string) {
  if (email) {
    const found = data.tenants.find((t) => t.email.toLowerCase() === email.toLowerCase());
    if (found) return found;
  }
  const configured = data.current_tenant_id
    ? data.tenants.find((tenant) => tenant.tenant_id === data.current_tenant_id)
    : undefined;
  return configured ?? data.tenants.find((tenant) => tenant.whitelisted) ?? data.tenants[0];
}

export function getPropertiesForTenant(tenant: TenantInfo, properties: PropertyInfo[] = defaultTenantInfo.properties) {
  return properties.filter((property) => tenant.property_ids.includes(property.property_id) && property.active);
}
