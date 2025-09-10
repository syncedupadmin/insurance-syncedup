export default function handler(req, res) {
  res.status(200).json({
    version: "2025-09-10-clean-urls",
    timestamp: new Date().toISOString(),
    message: "Clean URLs deployment - redirects to /admin not /_admin",
    redirects: {
      admin: "/admin",
      manager: "/manager",
      agent: "/agent",
      customer_service: "/customer-service",
      super_admin: "/super-admin"
    }
  });
}