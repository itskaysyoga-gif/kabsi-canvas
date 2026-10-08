// Vercel build guard (P0.1-03). Fails the build when a required variable is missing or empty, and when a server secret
// has been given a name the browser bundle would read. The values are never printed. See docs/hosting.md.
const REQUIRED = ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"];
const SECRET_NAMES = /(SERVICE_ROLE|JWT_SECRET|SECRET_KEY|POSTGRES_PASSWORD)/;

export function checkEnv(env) {
  const problems = [];
  for (const name of REQUIRED) {
    if (!env[name] || !String(env[name]).trim()) problems.push(`${name} is missing`);
  }
  for (const name of Object.keys(env)) {
    if (name.startsWith("VITE_") && SECRET_NAMES.test(name)) {
      problems.push(`${name} would put a server secret in the browser bundle`);
    }
  }
  return problems;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const problems = checkEnv(process.env);
  if (problems.length) {
    console.error("Environment check failed (docs/hosting.md):\n- " + problems.join("\n- "));
    process.exit(1);
  }
  console.log(`Environment check passed: ${REQUIRED.join(", ")} are set.`);
}
