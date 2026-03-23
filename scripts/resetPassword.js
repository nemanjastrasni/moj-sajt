const { PrismaClient } = require("@prisma/client")
const bcrypt = require("bcrypt")

const prisma = new PrismaClient()

async function run() {
  const email = "nemanjaivanovic979@gmail.com"
  const newPassword = "123456"

  const hash = await bcrypt.hash(newPassword, 10)

  await prisma.user.update({
    where: { email },
    data: { password: hash },
  })

  console.log("Password resetovan")
}

run()