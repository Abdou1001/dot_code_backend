import axios from "axios";
import {normalizeYemenPhone} from "../utils/phone.js";

const TEXTBEE_API_KEY = process.env.TEXTBEE_API_KEY;

/**
 * Sends a non-sensitive SMS through the configured TextBee gateway.
 *
 * Normalizes the destination using the shared Yemeni phone utility and never
 * logs message contents, which may contain patient information or OTP values.
 *
 * @param {string} phoneNumber - Recipient mobile number.
 * @param {string} message - SMS body.
 * @returns {Promise<object>} TextBee delivery response.
 */
export const sendSMS = async (phoneNumber, message) => {
    try {
        const {data} = await axios.post(
            "https://api.textbee.dev/api/v1/gateway/send-sms",
            {
                recipients: [normalizeYemenPhone(phoneNumber)],
                message,
            },
            {
                headers: {
                    "x-api-key": TEXTBEE_API_KEY,
                    "Content-Type": "application/json",
                },
            },
        );

        return data;
    } catch (error) {
        console.error("TextBee SMS Error:", {
            message: error.message,
            status: error.response?.status,
        });

        throw new Error("فشل إرسال الرسالة النصية");
    }
};

/**
 * Sends the existing OTP message without changing its public behavior.
 *
 * @param {string} phoneNumber - Recipient mobile number.
 * @param {string} otp - One-time password to send.
 * @returns {Promise<object>} TextBee delivery response.
 */
export const sendOTP = async (phoneNumber, otp) => {
    try {
        return await sendSMS(phoneNumber, `رمز التحقق الخاص بك هو: ${otp}`);
    } catch (error) {
        console.error("TextBee OTP Error:", {
            message: error.message,
            status: error.response?.status,
        });

        throw new Error("فشل إرسال رمز التحقق");
    }
};

// import axios from "axios";

// const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
// const PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID;
// const API_VERSION = process.env.META_API_VERSION;

// /* =========================
//    Send WhatsApp OTP
// ========================= */

// export const sendOTP = async (phoneNumber, otp) => {
//     try {
//         const {data} = await axios.post(
//             `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`,
//             {
//                 messaging_product: "whatsapp",
//                 to: phoneNumber,
//                 type: "template",
//                 template: {
//                     name: "hello_world",
//                     language: {
//                         code: "en_US",
//                     },
//                     // components: [
//                     //     {
//                     //         type: "body",
//                     //         parameters: [
//                     //             {
//                     //                 type: "text",
//                     //                 text: otp,
//                     //             },
//                     //         ],
//                     //     },
//                     // ],
//                 },
//             },

//             {
//                 headers: {
//                     Authorization: `Bearer ${ACCESS_TOKEN}`,
//                     "Content-Type": "application/json",
//                 },
//             },
//         );

//         return data;
//     } catch (error) {
//         console.log({
//             ACCESS_TOKEN: ACCESS_TOKEN?.substring(0, 20),
//             PHONE_NUMBER_ID,
//             API_VERSION,
//         });
//         console.error(error.response?.data || error.message);
//         throw new Error("فشل إرسال رسالة واتساب");
//     }
// };
