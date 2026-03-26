const { PrismaClient } = require("@prisma/client")
const bcrypt = require("bcrypt")

const prisma = new PrismaClient()

async function run() {
  const email = "nemanjaivanovic979@gmail.com"
  const password = "nenadjebivi12" // stavi koji hoces

  const hashed = await bcrypt.hash(password, 10)

  await prisma.user.upsert({
    where: { email },
    update: {
      password: hashed,
      role: "admin"
    },
    create: {
      email,
      name: "Nemanja",
      password: hashed,
      role: "admin"
    }
  })

  console.log("ADMIN OK")
  await prisma.$disconnect()
}

run()