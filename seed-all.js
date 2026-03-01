// Seed script — exact match to user's SQL data
require('dotenv').config({ path: '.env.local' });
const { db } = require('./lib/db');
const { complexes, shops, renters, renterShops } = require('./lib/db/schema');

async function seed() {
    // ===== COMPLEXES =====
    console.log('🏢 Creating complexes...');
    const [cPump] = await db.insert(complexes).values({ name: 'Mauli - Pump Shops' }).returning();
    const [cNew] = await db.insert(complexes).values({ name: 'New Complex' }).returning();
    const [cTower] = await db.insert(complexes).values({ name: 'Mauli Tower' }).returning();
    const [cBus] = await db.insert(complexes).values({ name: 'Mauli Bus Terminal' }).returning();
    console.log('✅ 4 complexes');

    // Helpers
    const S = async (no, cid, rent) => {
        const [s] = await db.insert(shops).values({ shopNo: no, complexId: cid, rentAmount: (rent || 0).toString(), rentCollectionDay: 1, isActive: true }).returning();
        return s;
    };
    const R = async (code, name, phone) => {
        const [r] = await db.insert(renters).values({ renterCode: code, name, phone: phone || '' }).returning();
        return r;
    };
    const A = async (rid, sid, dep) => {
        await db.insert(renterShops).values({ renterId: rid, shopId: sid, depositAmount: (dep || 0).toString() });
    };

    // ===== RENTERS (all at once, exact codes from SQL) =====
    console.log('\n👥 Creating renters...');
    // Pump
    const rp01 = await R('RP01', 'Shbham Dhage', '8482953770');
    const rp02 = await R('RP02', 'Umesh Zodane', '8788246205');
    const rp03 = await R('RP03', 'Mahesh Pohare', '');
    const rp04 = await R('RP04', 'Umesh Bhaskar Tayade', '');
    const rp05 = await R('RP05', 'Jawanjal Rasvanti', '9850384412');
    const rp06 = await R('RP06', 'Purushottam Kakpure', '');
    const rp07 = await R('RP07', 'Rajasthani Faluda', '');
    const rp08 = await R('RP08', 'Shivaji Mankar', '');
    const rp09 = await R('RP09', 'Ganesh Dhandar', '');
    // New Complex
    const rn01 = await R('RN01', 'Sangita Deshmukh', '9604242735');
    const rn02 = await R('RN02', 'Rahul Pote', '9922051926');
    const rn03 = await R('RN03', 'Ajay Nemane', '');
    const rn04 = await R('RN04', 'Yogita Khond & Sanjay Anasane', '');
    const rn05 = await R('RN05', 'Jayant Pachore', '');
    const rn06 = await R('RN06', 'Sachin Dose', '');
    const rn07 = await R('RN07', 'Mahendra Agrawal', '7020722747');
    const rn08 = await R('RN08', 'Swapnil Paraskar', '');
    const rn09 = await R('RN09', 'Santosh Gajare', '');
    const rn10 = await R('RN10', 'Shriram Ghate', '');
    const rn11 = await R('RN11', 'Deva Garmode', ''); // shared with Bus Terminal
    const rn12 = await R('RN12', 'Altaf Shekh (Altar Cushion)', '');
    const rn13 = await R('RN13', 'Gajanan Thakare', '');
    const rn14 = await R('RN14', 'Vaibhav Maisave', '');
    const rn15 = await R('RN15', 'Nilam Varma', '');
    // Tower
    const rt01 = await R('RT01', 'Roshan Patil', '');
    const rt02 = await R('RT02', 'Buldana District Bank', '');
    const rt03 = await R('RT03', 'Amol Karale', '');
    const rt04 = await R('RT04', 'Vinay Mirge', '');
    const rt05 = await R('RT05', 'Nandlal Unahle', '');
    const rt06 = await R('RT06', 'Rajendra Patil (Joy Motors)', '');
    const rt07 = await R('RT07', 'Nandkishor Pundkar', '');
    const rt08 = await R('RT08', 'Rajendra Patil (TVS Showroom)', '');
    const rt09 = await R('RT09', 'Anil Zadokar', '');
    const rt10 = await R('RT10', 'Nilesh Pise', '');
    const rt11 = await R('RT11', 'Vijay Vyas', '');
    const rt12 = await R('RT12', 'Amit Jayant Tayade', '');
    const rt13 = await R('RT13', 'Amar Deshmukh (Gas Agency)', '');
    const rt14 = await R('RT14', 'Anant Dindokar', '');
    const rt15 = await R('RT15', 'Sanjay Wagh', '');
    const rt16 = await R('RT16', 'Dhananjay Bhende', '');
    const rt17 = await R('RT17', 'Kapil Wakode', '');
    const rt18 = await R('RT18', 'Ganesh Pise', '');
    const rt19 = await R('RT19', 'Shri Bhawani Bank', '');
    const rt20 = await R('RT20', 'Bhushan Ashok Hingane', '');
    const rt21 = await R('RT21', 'Vision Infrastructure', '');
    const rt22 = await R('RT22', 'Raju Kenkar', '');
    // Bus Terminal
    const rb01 = await R('RB01', 'Aditya Chavhan', '');
    const rb02 = await R('RB02', 'Mahesh Kale', '');
    const rb03 = await R('RB03', 'Dnyaneshwar Hingane', '');
    const rb04 = await R('RB04', 'Ganesh Bhand', '');
    const rb05 = await R('RB05', 'Gaurav Zadokar', '');
    const rb06 = await R('RB06', 'Pravin Lokhande', '');
    const rb07 = await R('RB07', 'Dnyaneshwar Kakpure', '');
    const rb08 = await R('RB08', 'Bhushan Mapari', '');
    const rb09 = await R('RB09', 'Devanand Aarsule', '');
    const rb10 = await R('RB10', 'Deepak Sharma', '');
    console.log('✅ 56 renters');

    // ===== MAULI - PUMP SHOPS =====
    console.log('\n🔹 Mauli - Pump Shops...');
    const p = cPump.id;
    let s;
    s = await S('1', p, 5000); await A(rp01.id, s.id, 200000);
    s = await S('2', p, 5000); await A(rp02.id, s.id, 500000);
    s = await S('3', p, 5000); await A(rp02.id, s.id, 500000);
    s = await S('4', p, 10000); await A(rp03.id, s.id, 100000);
    s = await S('5–9', p, 35000); await A(rp04.id, s.id, 300000);
    s = await S('11', p, 5000); await A(rp05.id, s.id, 500000);
    s = await S('12', p, 4000); await A(rp06.id, s.id, 0);
    s = await S('13', p, 5000); await A(rp07.id, s.id, 0);
    s = await S('14', p, 4000); await A(rp08.id, s.id, 0);
    s = await S('15', p, 6000); await A(rp09.id, s.id, 0);
    console.log('✅ 10 shops');

    // ===== NEW COMPLEX =====
    console.log('\n🔹 New Complex...');
    const n = cNew.id;
    s = await S('1 & 2', n, 15000); await A(rn01.id, s.id, 300000);
    s = await S('3', n, 10000); await A(rn02.id, s.id, 150000);
    s = await S('4', n, 10000); await A(rn03.id, s.id, 150000);
    s = await S('5', n, 10000); await A(rn04.id, s.id, 150000);
    s = await S('6', n, 10000); await A(rn05.id, s.id, 150000);
    s = await S('7', n, 10000); await A(rn06.id, s.id, 150000);
    s = await S('8', n, 10000); await A(rn07.id, s.id, 150000);
    s = await S('9 & 10', n, 20000); await A(rn08.id, s.id, 300000);
    s = await S('11', n, 10000); await A(rn09.id, s.id, 150000);
    s = await S('12', n, 5000); await A(rn10.id, s.id, 100000);
    s = await S('17', n, 5000); await A(rn11.id, s.id, 100000);
    s = await S('18', n, 10000); await A(rn12.id, s.id, 150000);
    s = await S('19 & 20', n, 10000); await A(rn13.id, s.id, 150000);
    s = await S('21', n, 10000); await A(rn14.id, s.id, 150000);
    s = await S('22', n, 10000); await A(rn15.id, s.id, 150000);
    console.log('✅ 15 shops');

    // ===== MAULI TOWER =====
    console.log('\n🔹 Mauli Tower...');
    const t = cTower.id;
    s = await S('B-23', t, 5000); await A(rt01.id, s.id, 0);
    s = await S('B-25 & 26', t, 20000); await A(rt02.id, s.id, 0);
    s = await S('B-27', t, 5000); await A(rt03.id, s.id, 0);
    s = await S('B-28', t, 0); await A(rt04.id, s.id, 0);
    s = await S('B-29', t, 7000); await A(rt05.id, s.id, 0);
    s = await S('B-30', t, 7000); await A(rt05.id, s.id, 0); // Nandlal Unahle
    s = await S('B-34', t, 3000); await A(rt05.id, s.id, 0); // Nandlal Unahle
    s = await S('G-03', t, 10000); await A(rt06.id, s.id, 0);
    s = await S('G-4 & 5', t, 25000); await A(rt07.id, s.id, 0);
    s = await S('G-18,19,20', t, 20000); await A(rt08.id, s.id, 0);
    s = await S('G-29', t, 15000); await A(rt09.id, s.id, 100000);
    s = await S('G-31', t, 10000); await A(rt10.id, s.id, 0); // Nilesh Pise
    s = await S('G-34', t, 0); await A(rt11.id, s.id, 0);
    s = await S('G-36', t, 6000); await A(rt12.id, s.id, 100000);
    s = await S('G-40', t, 15000); await A(rt13.id, s.id, 0);
    s = await S('G-41', t, 15000); await A(rt14.id, s.id, 150000);
    s = await S('G-42', t, 12000); await A(rt15.id, s.id, 300000);
    s = await S('G-43', t, 5500); await A(rt16.id, s.id, 0);
    s = await S('G-44', t, 5000); await A(rt10.id, s.id, 0); // Nilesh Pise
    s = await S('G-45', t, 5000); await A(rt17.id, s.id, 0);
    s = await S('G-47', t, 0); await A(rt18.id, s.id, 0);
    s = await S('G-49', t, 3000); await A(rt05.id, s.id, 0); // Nandlal Unahle
    s = await S('G-51', t, 20000); await A(rt19.id, s.id, 0);
    s = await S('G-52', t, 13000); await A(rt20.id, s.id, 0);
    s = await S('G-55', t, 6000); await A(rt21.id, s.id, 0);
    s = await S('G-61', t, 2000); await A(rt22.id, s.id, 0);
    console.log('✅ 26 shops');

    // ===== MAULI BUS TERMINAL =====
    console.log('\n🔹 Mauli Bus Terminal...');
    const b = cBus.id;
    s = await S('2', b, 10000); await A(rb01.id, s.id, 100000);
    s = await S('6', b, 5000); await A(rb02.id, s.id, 50000);
    s = await S('7', b, 5000); await A(rn11.id, s.id, 50000); // Deva Garmode (RN11) shared!
    s = await S('8', b, 5000); await A(rb03.id, s.id, 50000);
    s = await S('9', b, 5000); await A(rb04.id, s.id, 35000);
    s = await S('10', b, 0); await A(rb05.id, s.id, 50000);
    s = await S('12', b, 5000); await A(rb06.id, s.id, 50000);
    s = await S('13', b, 2500); await A(rb07.id, s.id, 25000);
    s = await S('15', b, 5000); await A(rb08.id, s.id, 50000);
    s = await S('16', b, 5000); await A(rb09.id, s.id, 50000);
    s = await S('18', b, 5000); await A(rb01.id, s.id, 50000); // Aditya Chavhan (RB01) 2nd shop
    s = await S('21', b, 5000); await A(rb10.id, s.id, 50000);
    console.log('✅ 12 shops');

    // ===== SUMMARY =====
    console.log('\n🎉 ALL DATA SEEDED!');
    console.log('  4 Complexes');
    console.log('  63 Shops (10 + 15 + 26 + 12)');
    console.log('  56 Renters (RP01-09, RN01-15, RT01-22, RB01-10)');
    console.log('  Shared: Deva Garmode (RN11) in New+Bus, Nandlal Unahle (RT05) 4 shops, Nilesh Pise (RT10) 2 shops, Aditya Chavhan (RB01) 2 shops');

    process.exit(0);
}

seed().catch(err => { console.error('❌ Error:', err.message); process.exit(1); });
