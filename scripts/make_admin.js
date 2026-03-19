const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()

async function run(){
  await prisma.user.update({
    where: { email: "test@test.com" },
    data: { role: "admin" }
  })
  console.log("ADMIN SET")
}

run()