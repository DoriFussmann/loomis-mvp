import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load env from .env file
const envPath = resolve(__dirname, "../.env");
const envContent = readFileSync(envPath, "utf-8");
const env = Object.fromEntries(
  envContent
    .split("\n")
    .filter((line) => line.includes("=") && !line.startsWith("#"))
    .map((line) => {
      const idx = line.indexOf("=");
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim().replace(/^"|"$/g, "")];
    })
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const clients = [
  // [MATCH-A] Step-1 match client (Member ID + insurer)
  { first_name: "James",     last_name: "Whitfield",   dob: "1968-04-22", member_id: "MBR-2847163",  insurer_name: "Blue Cross Blue Shield" },

  // [MATCH-B] Step-2 match client (last name + DoB fallback)
  { first_name: "Patricia",  last_name: "Harrington",  dob: "1971-09-14", member_id: "MBR-9910034",  insurer_name: "Aetna Health" },

  // 48 additional dummy clients
  { first_name: "Michael",   last_name: "Torres",      dob: "1975-11-03", member_id: "MBR-1001001",  insurer_name: "UnitedHealthcare" },
  { first_name: "Sandra",    last_name: "Kim",         dob: "1982-06-17", member_id: "MBR-1001002",  insurer_name: "Cigna" },
  { first_name: "Robert",    last_name: "Nguyen",      dob: "1990-01-29", member_id: "MBR-1001003",  insurer_name: "Humana" },
  { first_name: "Lisa",      last_name: "Patel",       dob: "1965-08-11", member_id: "MBR-1001004",  insurer_name: "Blue Cross Blue Shield" },
  { first_name: "David",     last_name: "Martinez",    dob: "1978-03-25", member_id: "MBR-1001005",  insurer_name: "Aetna Health" },
  { first_name: "Karen",     last_name: "Johnson",     dob: "1955-12-09", member_id: "MBR-1001006",  insurer_name: "Medicare Advantage" },
  { first_name: "Thomas",    last_name: "Williams",    dob: "1988-07-14", member_id: "MBR-1001007",  insurer_name: "UnitedHealthcare" },
  { first_name: "Maria",     last_name: "Garcia",      dob: "1993-05-30", member_id: "MBR-1001008",  insurer_name: "Cigna" },
  { first_name: "Charles",   last_name: "Lee",         dob: "1970-10-18", member_id: "MBR-1001009",  insurer_name: "Humana" },
  { first_name: "Nancy",     last_name: "Brown",       dob: "1963-02-07", member_id: "MBR-1001010",  insurer_name: "Molina Healthcare" },
  { first_name: "Steven",    last_name: "Davis",       dob: "1986-09-22", member_id: "MBR-1001011",  insurer_name: "Blue Shield of California" },
  { first_name: "Betty",     last_name: "Miller",      dob: "1958-04-15", member_id: "MBR-1001012",  insurer_name: "Kaiser Permanente" },
  { first_name: "Paul",      last_name: "Wilson",      dob: "1995-11-28", member_id: "MBR-1001013",  insurer_name: "UnitedHealthcare" },
  { first_name: "Dorothy",   last_name: "Anderson",    dob: "1949-06-03", member_id: "MBR-1001014",  insurer_name: "Medicare Advantage" },
  { first_name: "Mark",      last_name: "Thomas",      dob: "1972-01-19", member_id: "MBR-1001015",  insurer_name: "Aetna Health" },
  { first_name: "Helen",     last_name: "Jackson",     dob: "1980-08-06", member_id: "MBR-1001016",  insurer_name: "Cigna" },
  { first_name: "Kenneth",   last_name: "White",       dob: "1967-03-31", member_id: "MBR-1001017",  insurer_name: "Blue Cross Blue Shield" },
  { first_name: "Susan",     last_name: "Harris",      dob: "1991-10-24", member_id: "MBR-1001018",  insurer_name: "Humana" },
  { first_name: "George",    last_name: "Martin",      dob: "1960-05-12", member_id: "MBR-1001019",  insurer_name: "Molina Healthcare" },
  { first_name: "Angela",    last_name: "Thompson",    dob: "1984-07-09", member_id: "MBR-1001020",  insurer_name: "Blue Shield of California" },
  { first_name: "Joshua",    last_name: "Moore",       dob: "1997-12-01", member_id: "MBR-1001021",  insurer_name: "UnitedHealthcare" },
  { first_name: "Ruth",      last_name: "Taylor",      dob: "1953-02-18", member_id: "MBR-1001022",  insurer_name: "Medicare Advantage" },
  { first_name: "Brian",     last_name: "Allen",       dob: "1976-09-07", member_id: "MBR-1001023",  insurer_name: "Cigna" },
  { first_name: "Laura",     last_name: "Young",       dob: "1989-04-26", member_id: "MBR-1001024",  insurer_name: "Aetna Health" },
  { first_name: "Kevin",     last_name: "Hernandez",   dob: "1962-11-15", member_id: "MBR-1001025",  insurer_name: "Humana" },
  { first_name: "Sarah",     last_name: "King",        dob: "1994-06-20", member_id: "MBR-1001026",  insurer_name: "Blue Cross Blue Shield" },
  { first_name: "Edward",    last_name: "Wright",      dob: "1971-03-08", member_id: "MBR-1001027",  insurer_name: "Kaiser Permanente" },
  { first_name: "Amy",       last_name: "Lopez",       dob: "1983-08-27", member_id: "MBR-1001028",  insurer_name: "UnitedHealthcare" },
  { first_name: "Ronald",    last_name: "Hill",        dob: "1956-01-14", member_id: "MBR-1001029",  insurer_name: "Medicare Advantage" },
  { first_name: "Kimberly",  last_name: "Scott",       dob: "1998-07-03", member_id: "MBR-1001030",  insurer_name: "Cigna" },
  { first_name: "Anthony",   last_name: "Green",       dob: "1969-04-19", member_id: "MBR-1001031",  insurer_name: "Molina Healthcare" },
  { first_name: "Donna",     last_name: "Adams",       dob: "1977-10-08", member_id: "MBR-1001032",  insurer_name: "Blue Shield of California" },
  { first_name: "Jason",     last_name: "Baker",       dob: "1992-02-25", member_id: "MBR-1001033",  insurer_name: "Aetna Health" },
  { first_name: "Michelle",  last_name: "Gonzalez",    dob: "1961-09-11", member_id: "MBR-1001034",  insurer_name: "UnitedHealthcare" },
  { first_name: "Gary",      last_name: "Nelson",      dob: "1985-06-04", member_id: "MBR-1001035",  insurer_name: "Humana" },
  { first_name: "Melissa",   last_name: "Carter",      dob: "1973-01-30", member_id: "MBR-1001036",  insurer_name: "Blue Cross Blue Shield" },
  { first_name: "Timothy",   last_name: "Mitchell",    dob: "1990-08-16", member_id: "MBR-1001037",  insurer_name: "Cigna" },
  { first_name: "Stephanie", last_name: "Perez",       dob: "1966-03-22", member_id: "MBR-1001038",  insurer_name: "Kaiser Permanente" },
  { first_name: "Jose",      last_name: "Roberts",     dob: "1979-11-07", member_id: "MBR-1001039",  insurer_name: "UnitedHealthcare" },
  { first_name: "Sharon",    last_name: "Turner",      dob: "1954-06-29", member_id: "MBR-1001040",  insurer_name: "Medicare Advantage" },
  { first_name: "Christopher",last_name: "Phillips",   dob: "1987-02-14", member_id: "MBR-1001041",  insurer_name: "Aetna Health" },
  { first_name: "Deborah",   last_name: "Campbell",    dob: "1996-09-05", member_id: "MBR-1001042",  insurer_name: "Cigna" },
  { first_name: "Eric",      last_name: "Evans",       dob: "1964-04-21", member_id: "MBR-1001043",  insurer_name: "Molina Healthcare" },
  { first_name: "Rachel",    last_name: "Edwards",     dob: "1981-12-10", member_id: "MBR-1001044",  insurer_name: "Blue Shield of California" },
  { first_name: "Jeffrey",   last_name: "Collins",     dob: "1993-07-17", member_id: "MBR-1001045",  insurer_name: "UnitedHealthcare" },
  { first_name: "Amanda",    last_name: "Stewart",     dob: "1957-02-28", member_id: "MBR-1001046",  insurer_name: "Medicare Advantage" },
  { first_name: "Ryan",      last_name: "Sanchez",     dob: "1970-10-03", member_id: "MBR-1001047",  insurer_name: "Humana" },
  { first_name: "Carolyn",   last_name: "Flores",      dob: "1988-05-19", member_id: "MBR-1001048",  insurer_name: "Blue Cross Blue Shield" },
];

async function main() {
  console.log(`Seeding ${clients.length} clients…`);

  // First ensure the table exists by attempting a count
  const { error: checkError } = await supabase.from("clients").select("id", { count: "exact", head: true });
  if (checkError) {
    console.error("❌ Cannot reach clients table. Run the migration first:\n");
    console.error("   supabase/migrations/20260515_create_clients.sql\n");
    console.error("Error:", checkError.message);
    process.exit(1);
  }

  const { error } = await supabase
    .from("clients")
    .upsert(clients, { onConflict: "member_id" });

  if (error) {
    console.error("❌ Seed failed:", error.message);
    process.exit(1);
  }

  const { count } = await supabase.from("clients").select("*", { count: "exact", head: true });
  console.log(`✓ Done. ${count} clients now in database.`);
}

main();
