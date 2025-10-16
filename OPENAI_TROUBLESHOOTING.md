# 🚨 OpenAI API Troubleshooting Guide

## ❌ **Current Issue: "OpenAI API quota exceeded"**

The error you're seeing means your OpenAI API usage has hit a limit. Here's how to fix it:

## 🔍 **Understanding the Error**

**Error Code 429**: "Too Many Requests" - This happens when:
1. **Monthly quota exceeded** - You've used all your API credits
2. **Rate limiting** - Making requests too fast
3. **Billing issues** - Payment method problems
4. **Free tier limits** - Exceeded free usage allowance

## 🛠️ **Immediate Solutions**

### **1. Check Your OpenAI Account**
Visit: https://platform.openai.com/account/usage

**What to check:**
- Current usage vs. limits
- Available credits
- Billing status
- Payment method

### **2. Billing Setup**
Visit: https://platform.openai.com/account/billing

**Required actions:**
- Add a valid payment method (credit card)
- Set up billing limits if needed
- Check if you have sufficient credits

### **3. API Key Verification**
Visit: https://platform.openai.com/api-keys

**Verify:**
- API key is active and valid
- Key has proper permissions
- Key is correctly set in `.env.local`

## 💡 **Quick Fixes**

### **Option 1: Wait and Retry**
If you're on the free tier:
- Wait 1 hour and try again
- Free tier resets monthly
- Limited to $5/month initially

### **Option 2: Add Payment Method**
1. Go to https://platform.openai.com/account/billing
2. Add credit card
3. Set usage limits ($10-20 recommended for testing)
4. Wait 5-10 minutes for activation

### **Option 3: Use Smaller Text**
- Upload smaller PDFs (< 5 pages)
- This uses fewer API credits
- Good for testing while quota is low

## 📊 **Understanding OpenAI Pricing**

### **TTS (Text-to-Speech) Costs:**
- **Model**: tts-1-hd (high quality)
- **Cost**: $0.030 per 1K characters
- **Example**: 1000 words ≈ $0.15-0.30

### **Typical Usage:**
- **Small PDF** (5 pages): ~$0.50-1.00
- **Medium PDF** (20 pages): ~$2.00-4.00
- **Large PDF** (50 pages): ~$5.00-10.00

## 🔧 **Technical Solutions**

### **1. Reduce Text Length**
The app automatically truncates text to 4000 characters, but you can reduce further:

Edit `src/app/api/convert-to-audio/route.ts` line 107:
```typescript
// Reduce from 4000 to 2000 characters for testing
if (processedText.length > 2000) {
```

### **2. Add Retry Logic**
The app now includes better error handling with specific messages for:
- Quota exceeded
- Rate limiting
- Billing issues
- API key problems

### **3. Test Mode**
For development, you can temporarily use a shorter sample text instead of the full PDF.

## 🎯 **Recommended Setup for Production**

### **Billing Configuration:**
1. **Payment Method**: Add valid credit card
2. **Usage Limits**: Set monthly limit ($20-50)
3. **Alerts**: Enable usage notifications
4. **Monitoring**: Check usage regularly

### **API Key Security:**
1. **Environment Variables**: Never commit API keys
2. **Rotation**: Rotate keys periodically
3. **Permissions**: Use least-privilege access
4. **Monitoring**: Watch for unusual usage

## 📱 **User Experience Improvements**

The app now provides better error messages:
- ✅ Clear explanation of quota issues
- ✅ Direct links to OpenAI billing
- ✅ Specific troubleshooting steps
- ✅ Retry suggestions

## 🚀 **Getting Back Online**

### **Immediate Steps:**
1. **Check billing**: https://platform.openai.com/account/billing
2. **Add payment method** if needed
3. **Wait 5-10 minutes** for activation
4. **Try uploading a small PDF** (1-2 pages)
5. **Monitor usage** at https://platform.openai.com/account/usage

### **Long-term Setup:**
1. Set reasonable usage limits
2. Monitor costs regularly
3. Consider implementing user quotas
4. Add usage analytics to your app

## 💰 **Cost Management Tips**

### **For Development:**
- Use shorter test documents
- Set low usage limits ($5-10)
- Monitor usage daily
- Use free tier wisely

### **For Production:**
- Implement user limits
- Add payment processing
- Monitor costs per user
- Consider caching popular conversions

## 📞 **Still Having Issues?**

### **OpenAI Support:**
- Help Center: https://help.openai.com
- Community: https://community.openai.com
- Status Page: https://status.openai.com

### **Common Solutions:**
1. **Clear browser cache** and try again
2. **Restart the development server**
3. **Check internet connection**
4. **Verify API key** in `.env.local`
5. **Wait 1 hour** and retry

---

**Remember**: OpenAI TTS is a paid service. The free tier has very limited usage. For regular use, you'll need to add a payment method and set up billing.

**Your app is working correctly** - this is just an API quota issue that's easily resolved with proper billing setup! 🎉
