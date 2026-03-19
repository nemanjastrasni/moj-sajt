const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()

async function run() {

  const email = "nemanjaivanovic979@gmail.com"

  const user = await prisma.user.findUnique({
    where: { email }
  })

  if (!user) {
    console.log("USER NE POSTOJI:", email)
    return
  }

  await prisma.user.update({
    where: { email },
    data: { role: "admin" }
  })

  console.log("ADMIN POSTAVLJEN:", email)
}

run()