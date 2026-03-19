const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()

await prisma.user.upsert({
  where: { email: "tvoj@mail.com" },
  update: { role: "admin" },
  create: {
    email: "nemanjaivanovic979@gmail.com",
    password: "nenadjebivi12",
    role: "admin"
  }
})
  console.log("ADMIN SET")

run().catch




