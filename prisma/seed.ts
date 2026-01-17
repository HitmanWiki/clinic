
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')
  
  // Create a test clinic
  const clinic = await prisma.clinic.upsert({
    where: { phone: '9876543210' },
    update: {},
    create: {
      name: 'Sharma Homeopathy Clinic',
      doctorName: 'Dr. Rajesh Sharma',
      phone: '9876543210',
      email: 'dr.sharma@clinic.com',
      address: '123 Health Street, Model Town',
      city: 'Delhi',
      googleReviewLink: 'https://g.page/r/Cg.../review',
      subscriptionPlan: 'professional',
      messageBalance: 247,
      settings: {
        followUpAutomation: true,
        reviewAutomation: true,
        whatsappEnabled: true,
        smsFallback: true,
        workingHoursStart: '09:00',
        workingHoursEnd: '20:00',
      },
    },
  })

  console.log('✅ Clinic created:', clinic.name)

  // Create user for the clinic
  const user = await prisma.user.upsert({
    where: { phone: '9876543210' },
    update: {},
    create: {
      phone: '9876543210',
      clinicId: clinic.id,
    },
  })

  console.log('✅ User created for clinic')

  // Create some test patients
  const patients = await Promise.all([
    prisma.patient.create({
      data: {
        clinicId: clinic.id,
        name: 'Rajesh Kumar',
        mobile: '9876543211',
        visitDate: new Date('2024-01-15'),
        notes: 'Fever with cold symptoms',
      },
    }),
    prisma.patient.create({
      data: {
        clinicId: clinic.id,
        name: 'Priya Sharma',
        mobile: '9876543212',
        visitDate: new Date('2024-01-14'),
        notes: 'Common cold treatment',
      },
    }),
    prisma.patient.create({
      data: {
        clinicId: clinic.id,
        name: 'Amit Patel',
        mobile: '9876543213',
        visitDate: new Date('2024-01-13'),
        notes: 'Cough and congestion',
      },
    }),
  ])

  console.log(`✅ Created ${patients.length} test patients`)

  // Create a prescription for first patient
  const prescription = await prisma.prescription.create({
    data: {
      patientId: patients[0].id,
      clinicId: clinic.id,
      diagnosis: 'Viral Fever',
      medicines: [
        { name: 'Paracetamol', dosage: '1-0-1', duration: '3 days', instructions: 'After food' },
        { name: 'Vitamin C', dosage: '0-0-1', duration: '5 days', instructions: 'Morning' },
      ],
      nextVisitDate: new Date('2024-01-20'),
      notes: 'Advised rest and hydration',
    },
  })

  console.log('✅ Prescription created')

  // Create follow-ups
  const followUps = await prisma.followUp.createMany({
    data: [
      {
        patientId: patients[0].id,
        clinicId: clinic.id,
        type: 'day2',
        scheduledDate: new Date('2024-01-17'),
        status: 'sent',
        channel: 'whatsapp',
        message: 'Health check-in message',
      },
      {
        patientId: patients[1].id,
        clinicId: clinic.id,
        type: 'day7',
        scheduledDate: new Date('2024-01-21'),
        status: 'pending',
        channel: 'whatsapp',
        message: 'Progress reminder',
      },
    ],
  })

  console.log(`✅ Created ${followUps.count} follow-ups`)

  console.log('🎉 Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
