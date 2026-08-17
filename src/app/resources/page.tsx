import Link from "next/link";

export default function ResourcesPage() {
  const resources = [
    {
      category: "Emergency & Immediate Help",
      items: [
        { title: "FEMA Disaster Assistance", desc: "Apply for federal disaster aid. Includes housing assistance, property repair, and other needs.", url: "https://www.disasterassistance.gov/", action: "Apply Now" },
        { title: "American Red Cross — Wisconsin", desc: "Emergency shelter, food, supplies, and health services for disaster victims.", url: "https://www.redcross.org/local/wisconsin.html", action: "Get Help" },
        { title: "Wisconsin Emergency Management", desc: "State-level disaster resources and recovery information.", url: "https://wem.wi.gov/", action: "Visit" },
        { title: "211 Wisconsin", desc: "Dial 211 or visit online for free, confidential help finding local resources.", url: "https://211wisconsin.communityos.org/", action: "Call or Visit" },
      ],
    },
    {
      category: "Insurance & Claims",
      items: [
        { title: "Wisconsin Office of the Commissioner of Insurance", desc: "Consumer guides for filing claims, avoiding scams, and understanding your rights.", url: "https://oci.wi.gov/Pages/Consumers/Home.aspx", action: "Learn More" },
        { title: "How to File an Insurance Claim (NAIC)", desc: "Step-by-step guide to filing and maximizing your insurance claim after a disaster.", url: "https://content.naic.org/consumer/disaster-preparedness.htm", action: "Read Guide" },
        { title: "Avoiding Contractor Fraud After a Storm", desc: "FTC guide to spotting and avoiding storm chaser scams.", url: "https://consumer.ftc.gov/articles/hiring-contractor", action: "Read Tips" },
      ],
    },
    {
      category: "Financial Assistance",
      items: [
        { title: "SBA Disaster Loans", desc: "Low-interest loans for homeowners, renters, and businesses affected by disasters.", url: "https://www.sba.gov/funding-programs/disaster-assistance", action: "Apply" },
        { title: "Wisconsin Unemployment — Disaster Unemployment Assistance", desc: "DUA benefits if you lost work due to the tornado.", url: "https://dwd.wisconsin.gov/uiben/dua/", action: "Check Eligibility" },
        { title: "Salvation Army — Fox Cities", desc: "Emergency financial assistance, food, and basic needs support.", url: "https://centralusa.salvationarmy.org/foxcities/", action: "Get Help" },
      ],
    },
    {
      category: "Rebuilding & Permits",
      items: [
        { title: "City of Menasha — Building Permits", desc: "Permit requirements and applications for storm damage repairs.", url: "https://www.menashawi.gov/departments/community_development/building_inspection.php", action: "Visit" },
        { title: "City of Appleton — Building Inspection", desc: "Building permits, inspections, and codes for Appleton residents.", url: "https://www.appleton.org/government/inspection", action: "Visit" },
        { title: "Fox Crossing — Building Permits", desc: "Permit information for Fox Crossing residents.", url: "https://foxcrossingwi.gov/departments/community-development/", action: "Visit" },
        { title: "Wisconsin DSPS — Contractor License Lookup", desc: "Verify a contractor's license before hiring. Protects against unlicensed work.", url: "https://apps.dsps.wi.gov/LicenseLookup/Default", action: "Verify License" },
      ],
    },
    {
      category: "Mental Health & Community Support",
      items: [
        { title: "Disaster Distress Helpline", desc: "24/7 crisis counseling for emotional distress from disasters. Call 1-800-985-5990.", url: "https://www.samhsa.gov/find-help/disaster-distress-helpline", action: "Call Now" },
        { title: "NAMI Fox Valley", desc: "Mental health support and resources for Fox Cities residents.", url: "https://www.namifoxvalley.org/", action: "Get Support" },
        { title: "Fox Cities Community Resources (United Way)", desc: "Comprehensive list of local assistance programs.", url: "https://www.unitedwayfoxcities.org/", action: "Browse Resources" },
      ],
    },
  ];

  return (
    <>
      {/* Hero */}
      <section className="bg-navy-hero text-white pt-14 sm:pt-20 pb-14 sm:pb-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <span className="badge-navy mb-6">
            <span className="w-2 h-2 rounded-full bg-green-400"></span>
            Verified &amp; sourced
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold mb-4">Disaster Recovery Resources</h1>
          <p className="text-lg text-blue-100/80 max-w-2xl mx-auto">
            Government, nonprofit, and community resources for Fox Cities tornado recovery — all links verified and
            relevant to Menasha, Appleton, and surrounding areas.
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-12 sm:py-16">
        <div className="space-y-12">
          {resources.map((section) => (
            <section key={section.category}>
              <h2 className="text-xl font-bold mb-4 pb-2 border-b border-gray-200">{section.category}</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {section.items.map((item) => (
                  <div key={item.title} className="card card-hover flex flex-col">
                    <h3 className="font-semibold mb-1">{item.title}</h3>
                    <p className="text-sm text-muted mb-4 flex-1">{item.desc}</p>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-brand-600 hover:text-brand-700 font-semibold inline-flex items-center gap-1"
                    >
                      {item.action} <span className="text-xs">↗</span>
                    </a>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-14 rounded-2xl bg-brand-50 border border-brand-100 p-8 text-center">
          <h3 className="text-lg font-bold mb-2">Did we miss something?</h3>
          <p className="text-muted text-sm mb-5">If you know of a resource that should be listed here, please let us know.</p>
          <a href="mailto:resources@donelocal.com" className="btn-primary !py-2.5 text-sm">
            Suggest a Resource
          </a>
        </div>
      </div>
    </>
  );
}
