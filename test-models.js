const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function test() {
  try {
    console.log('All Prisma properties:')
    const allProps = Object.keys(prisma)
    console.log(allProps)
    
    console.log('\nAvailable models (excluding $ and _ props):')
    const models = allProps.filter(key => 
      !key.startsWith('$') && 
      !key.startsWith('_') && 
      typeof prisma[key] === 'object'
    )
    console.log(models)
    
  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

test()
