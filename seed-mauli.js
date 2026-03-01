// Seed script for Mauli Pump Shops data
require('dotenv').config({ path: '.env.local' });
const { db } = require('./lib/db');
const { complexes, shops, renters, renterShops } = require('./lib/db/schema');

async function seed() {
    console.log('🏢 Creating complex: Mauli Pump Shops...');

    // 1. Create complex
    const [complex] = await db.insert(complexes).values({ name: 'Mauli Pump Shops' }).returning();
    console.log(`✅ Complex created: ID ${complex.id}`);

    // 2. Create 10 shops
    const shopData = [];
    for (let i = 1; i <= 10; i++) {
        shopData.push({
            shopNo: `MPS-${i}`,
            complexId: complex.id,
            category: 'Numeric',
            rentAmount: '0', // User can set rent later
            rentCollectionDay: 1,
            isActive: true,
        });
    }
    const createdShops = await db.insert(shops).values(shopData).returning();
    console.log(`✅ ${createdShops.length} shops created`);

    // 3. Create renters (Umesh Zodane has shops 2 & 3)
    const renterData = [
        { name: 'Shubham Dhage', renterCode: 'MPS-001', phone: '8482953770' },
        { name: 'Umesh Zodane', renterCode: 'MPS-002', phone: '8788246205' },
        { name: 'Mahesh Pohare', renterCode: 'MPS-003', phone: '' },
        { name: 'Umesh Bhaskar Tayade', renterCode: 'MPS-004', phone: '' },
        { name: 'Jawanjal Rasvanti', renterCode: 'MPS-005', phone: '9850384412' },
        { name: 'Purushottam Kakpure', renterCode: 'MPS-006', phone: '' },
        { name: 'Rajasthani Faluda', renterCode: 'MPS-007', phone: '' },
        { name: 'Shivaji Mankar', renterCode: 'MPS-008', phone: '' },
        { name: 'Ganesh Dhandar', renterCode: 'MPS-009', phone: '' },
    ];
    const createdRenters = await db.insert(renters).values(renterData).returning();
    console.log(`✅ ${createdRenters.length} renters created`);

    // Map renters by code for easy lookup
    const renterMap = {};
    createdRenters.forEach(r => { renterMap[r.renterCode] = r; });

    // Map shops by shopNo
    const shopMap = {};
    createdShops.forEach(s => { shopMap[s.shopNo] = s; });

    // 4. Create renter-shop assignments with deposits
    const assignments = [
        { renter: 'MPS-001', shop: 'MPS-1', deposit: '200000' },
        { renter: 'MPS-002', shop: 'MPS-2', deposit: '500000' },
        { renter: 'MPS-002', shop: 'MPS-3', deposit: '500000' }, // Umesh Zodane has 2 shops
        { renter: 'MPS-003', shop: 'MPS-4', deposit: '100000' },
        { renter: 'MPS-004', shop: 'MPS-5', deposit: '300000' },
        { renter: 'MPS-005', shop: 'MPS-6', deposit: '500000' },
        { renter: 'MPS-006', shop: 'MPS-7', deposit: '0' },
        { renter: 'MPS-007', shop: 'MPS-8', deposit: '0' },
        { renter: 'MPS-008', shop: 'MPS-9', deposit: '0' },
        { renter: 'MPS-009', shop: 'MPS-10', deposit: '0' },
    ];

    const assignmentData = assignments.map(a => ({
        renterId: renterMap[a.renter].id,
        shopId: shopMap[a.shop].id,
        depositAmount: a.deposit,
    }));

    const createdAssignments = await db.insert(renterShops).values(assignmentData).returning();
    console.log(`✅ ${createdAssignments.length} shop assignments created with deposits`);

    console.log('\n🎉 Mauli Pump Shops data seeded successfully!');
    console.log('\nSummary:');
    console.log(`  Complex: ${complex.name} (ID: ${complex.id})`);
    console.log(`  Shops: MPS-1 to MPS-10`);
    console.log(`  Renters: MPS-001 to MPS-009 (9 renters, 10 assignments)`);
    console.log(`  Note: Umesh Zodane (MPS-002) has Shop 2 & Shop 3`);

    process.exit(0);
}

seed().catch(err => { console.error('❌ Seed error:', err); process.exit(1); });
