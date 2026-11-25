import { test, expect } from "@playwright/test";

test.beforeEach(async({page})=>{
  await page.route("**/api/v1/auth/me",route=>route.fulfill({status:401,json:{error:{code:"UNAUTHORIZED",message:"Sign in"}}}));
  await page.route("**/api/v1/auth/refresh",route=>route.fulfill({status:401,json:{error:{code:"UNAUTHORIZED",message:"Sign in"}}}));
});

test("sign-in resend distinguishes an expired challenge, delivery failure and successful retry",async({page})=>{
  await page.route("**/api/v1/auth/login",route=>route.fulfill({json:{data:{requiresOtp:true,email:"recovery@carebora.test"}}}));
  let mode="expired";
  await page.route("**/api/v1/auth/login/resend-otp",route=>route.fulfill(mode==="failure"?{status:503,json:{error:{code:"SERVICE_UNAVAILABLE",message:"The email could not be sent. Please try again."}}}:{json:{data:{sent:mode==="success"}}}));
  await page.goto("/login");await page.getByLabel("Email",{exact:true}).fill("recovery@carebora.test");await page.getByLabel(/^Password/).fill("Test12345!");await page.getByRole("button",{name:"Log in",exact:true}).click();
  await page.getByRole("button",{name:"Resend code",exact:true}).click();await expect(page.getByText(/Your sign-in attempt has expired/)).toBeVisible();
  mode="failure";await page.getByRole("button",{name:"Resend code",exact:true}).click();await expect(page.getByText("The email could not be sent. Please try again.",{exact:true})).toBeVisible();
  mode="success";await page.getByLabel("Login code",{exact:true}).fill("123");await page.getByRole("button",{name:"Resend code",exact:true}).click();await expect(page.getByText("Code resent — check your inbox.",{exact:true})).toBeVisible();await expect(page.getByLabel("Login code",{exact:true})).toHaveValue("");
});

test("forgot password shows delivery errors and allows retry without leaving the form",async({page})=>{
  let fail=true;
  await page.route("**/api/v1/auth/forgot-password",route=>route.fulfill(fail?{status:503,json:{error:{code:"SERVICE_UNAVAILABLE",message:"The email could not be sent. Please try again."}}}:{json:{data:{sent:true}}}));
  await page.goto("/login");await page.getByRole("button",{name:"Forgot password?",exact:true}).click();await page.getByLabel("Email",{exact:true}).fill("recovery@carebora.test");await page.getByRole("button",{name:"Send reset link",exact:true}).click();await expect(page.getByText("The email could not be sent. Please try again.",{exact:true})).toBeVisible();
  fail=false;await page.getByRole("button",{name:"Send reset link",exact:true}).click();await expect(page.getByText("If an account exists for that email, we've sent a password reset link.",{exact:true})).toBeVisible();
});
