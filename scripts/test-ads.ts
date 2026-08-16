import { addAd, getActiveAdsByPlacement, deleteAd } from '../src/lib/data-store';

const ID = '__test_ad__';

async function main() {
  const created = await addAd({
    id: ID,
    title: 'Test Sponsor LLC',
    url: 'https://example.com',
    description: 'Free roof inspections',
    ctaText: 'Get a Quote',
    placement: 'sidebar',
    active: true,
  });
  console.log('PASS addAd:', created.title, '|', created.placement, '|', created.ctaText);

  const sidebar = await getActiveAdsByPlacement('sidebar');
  console.log('PASS sidebar ads contain test:', sidebar.some(a => a.id === ID));

  const event = await getActiveAdsByPlacement('event');
  console.log('PASS event ads empty:', event.length === 0);

  const deleted = await deleteAd(ID);
  console.log('PASS deleteAd:', deleted);

  const after = await getActiveAdsByPlacement('sidebar');
  console.log('PASS test ad gone:', !after.some(a => a.id === ID));
}

main().catch((e) => { console.error('FAIL', e); process.exit(1); });
