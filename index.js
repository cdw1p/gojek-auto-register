const moment = require('moment')
const fetch = require('node-fetch')
const readline = require('readline-sync')
const { v4: uuidv4 } = require('uuid')
require('dotenv').config()
require('colors')

/**
 * @description global variable
 */
const { GOJEK_ID, GOJEK_SECRET } = process.env
let gojekHeaders = {
  'Host': 'goid.gojekapi.com',
  'Accept': 'application/json',
  'X-Appversion': '4.20.1',
  'X-Appid': 'com.gojek.app',
  'X-Platform': 'Android',
  'X-Deviceos': 'Android,5.1',
  'X-User-Type': 'customer',
  'X-Phonemake': 'unknown',
  'X-Phonemodel': 'generic,Google',
  'X-Pushtokentype': 'FCM',
  'Accept-Language': 'id-ID',
  'X-User-Locale': 'id_ID',
  'X-Location-Accuracy': '3.0',
  'Gojek-Country-Code': 'ID',
  'Gojek-Service-Area': '14',
  'Gojek-Timezone': 'Asia/Jakarta',
  'Content-Type': 'application/json; charset=UTF-8',
  'Accept-Encoding': 'gzip, deflate',
  'User-Agent': 'okhttp/3.12.13',
}

/**
 * @param {int} length
 * @description generate unique id with length
 */
const genUniqueId = (length = 10) => new Promise((resolve, reject) => {
  let text = ''
  const character = 'abcdefghijklmnopqrstuvwxyz1234567890'
  for (var i = 0; i < length; i++) {
    text += character.charAt(Math.floor(Math.random() * character.length))
  }
  resolve(text)
})

/**
 * @param {int} min
 * @param {int} max
 * @description generate random range number
 */
const genRandomRange = (min = 1, max = 1) => new Promise((resolve, reject) => {
  resolve(Math.floor(Math.random() * (max - min + 1)) + min)
})

/**
 * @description generate fingerprint id
 */
const genFingerprint = () => new Promise(async (resolve, reject) => {
  let text = ''
  while (text.length <= 94) {
    text += `${await (await genUniqueId(2)).toUpperCase()}:`
  }
  resolve(text.slice(0,-1))
})

/**
 * @description generate headers gojek
 */
const genHeadersGojek = () => new Promise(async (resolve, reject) => {
  gojekHeaders['X-Session-ID'] = uuidv4()
  gojekHeaders['X-UniqueId'] = await genUniqueId(16)
  gojekHeaders['X-Location'] = `-6.220${await genRandomRange(100,999)},106.77${await genRandomRange(1000,9999)}`
  gojekHeaders['D1'] = `${await genFingerprint()}`
  resolve(true)
})

/**
 * @description generate random name
 */
const genRandomName = () => new Promise(async (resolve, reject) => {
  resolve(await (await fetch('https://api.namefake.com')).json())
})

/**
 * @param {string} phone_number
 * @description register new account gojek
 */
const gojekRegister = (phone_number) => new Promise(async (resolve, reject) => {
  try {
    const reqCheckNumber = await (await fetch('https://goid.gojekapi.com/goid/login/request', {
      method: 'POST',
      headers: gojekHeaders,
      body: JSON.stringify({ client_id: GOJEK_ID, client_secret: GOJEK_SECRET, country_code: '+62', phone_number: `${phone_number}` })
    })).json()
    if (!(reqCheckNumber.success)) {
      const { name, email_u } = await (await genRandomName())
      const resFullname = name
      const resEmail = `${email_u}${moment().unix().toString()}@gmail.com`
      const reqRegisterRequest = await (await fetch('https://api.gojekapi.com/v5/customers', {
        method: 'POST',
        headers: gojekHeaders,
        body: JSON.stringify({ email: `${resEmail}`, name: `${resFullname}`, phone: `+62${phone_number}`, signed_up_country: 'ID' })
      })).json()
      if (reqRegisterRequest.success) {
        const resOTPToken = reqRegisterRequest.data.otp_token
        const resOTPCode = await readline.question(`(${moment().format('HH:mm:ss')}) Enter the verification code : `)
        const reqVerifyOTP = await (await fetch('https://api.gojekapi.com/v5/customers/phone/verify', {
          method: 'POST',
          headers: gojekHeaders,
          body: JSON.stringify({ client_name: GOJEK_ID, client_secret: GOJEK_SECRET, data: { otp: resOTPCode, otp_token: resOTPToken } })
        })).json()
        if (reqVerifyOTP.success) {
          const { resource_owner_id, access_token, refresh_token } = reqVerifyOTP.data
          resolve({ resource_owner_id, access_token, refresh_token })
        } else {
          throw new Error(`[REG_VERIFY_OTP] ${reqVerifyOTP.errors[0].message || 'FAILED'}`)
        }
      } else {
        throw new Error(`[REG_REQUEST] ${reqRegisterRequest.errors[0].message || 'FAILED'}`)
      }
    } else {
      throw new Error(`[REG_CHECK_NUMBER] ${reqCheckNumber.errors[0].message || 'FAILED'}`)
    }
  } catch (err) {
    console.log(`(${moment().format('HH:mm:ss')}) ${err.message}`.red)
    resolve(false)
  }
})

/**
 * @description main function
 */
;(async () => {
  try {
    await genHeadersGojek()
    const phoneNumber = `85321351268`
    const resGojekRegister = await gojekRegister(phoneNumber)
    if (resGojekRegister) {
      const { resource_owner_id, access_token, refresh_token } = resGojekRegister
      console.log({ resource_owner_id, access_token, refresh_token })
    }
  } catch (err) {
    console.log(`(${moment().format('HH:mm:ss')}) ${err.message}`.red)
  }
})()