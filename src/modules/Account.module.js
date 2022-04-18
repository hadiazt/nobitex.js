const axios = require('axios');
const { Base, Paths } = require('../config.json')
module.exports = ({ token }) => {
    const config = {
        method: 'post',
        url: Base + Paths.User + '/profile',
        headers: {
            Authorization: `Token ${token}`,
        }
    };
    return new Promise((resolve) => {
        axios(config).then(data => {
            const req = data.data.profile;
            resolve({
                Account: { AccountID: req.id, Username: req.username, Email: req.email, Level: req.level, },
                Personal: { Firstname: req.firstName, Lastname: req.lastName, NationalCode: req.nationalCode, Nickname: req.nickname, Phone: req.phone, Mobile: req.mobile, Province: req.province, City: req.city, Address: req.address, },
                BankDetails: { BankCards: req.bankCards, BankAccounts: req.bankAccounts },
                Verifications: { Email: req.verifications.email, Phone: req.verifications.phone, Mobile: req.verifications.mobile, Identity: req.verifications.identity, Selfie: req.verifications.selfie, Auto_KYC: req.verifications.auto_kyc, BankAccount: req.verifications.bankAccount, BankCard: req.verifications.bankCard, Address: req.verifications.address, City: req.verifications.city, PhoneCode: req.verifications.phoneCode, MobileIdentity: req.verifications.mobileIdentity },
                Options: { Fee: req.options.fee, FeeUSDT: req.options.feeUsdt, Discount: req.options.discount, IsManualFee: req.options.isManualFee, TFA: req.options.tfa, SocialLoginEnabled: req.options.socialLoginEnabled },
                Features: req.features, ChatID: req.chatId, WithdrawEligible: req.withdrawEligible,
            })
        }).catch(e => { console.log(e?.response?.data?.detail) });
    });
}