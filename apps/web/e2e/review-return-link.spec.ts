import { test, expect } from "@playwright/test";
import { internalRedirect } from "../src/lib/internal-redirect";

test("review return links preserve the destination and reject normalized off-site URLs",()=>{
  const origin="https://app.carebora.co.ke";
  for(const path of ["/orders/example#review-vendor", "/appointments?review=example", "/home-visits/example"]) expect(internalRedirect(path,origin)).toBe(path);
  for(const path of [null,"https://example.com","//example.com","/\\example.com","/\t/example.com","//[", "javascript:alert(1)"]) expect(internalRedirect(path,origin)).toBe("/providers");
});
