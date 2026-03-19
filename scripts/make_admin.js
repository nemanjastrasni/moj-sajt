const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()

async function run() {

  const admins = [
    "nemanjajivanovic979@gmail.com",
    "test@test.com"
  ]

  for (const email of admins) {
    await prisma.user.update({
      where: { email },
      data: { role: "admin" }
    })
    console.log("ADMIN:", email)
  }

}

run()