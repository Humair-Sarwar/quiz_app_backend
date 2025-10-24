const { generalSettings, getGeneralSettings, createOrUpdateSocialLinks, getSocialLinks, createOrUpdateWebsiteServices, getWebsiteServices, getWebsiteData } = require('../controllers/SettingsController');
const auth = require('../middlewares/Authentication');

const router = require('express').Router();



router.post('/admin/settings/general', auth, generalSettings);

router.get("/admin/settings/general/get", auth, getGeneralSettings);

router.post('/admin/settings/social-links', auth, createOrUpdateSocialLinks);

router.get("/admin/settings/social-links/get", auth, getSocialLinks);

router.post("/admin/settings/website-services/create", auth, createOrUpdateWebsiteServices);

router.get("/admin/settings/website-services/get", auth, getWebsiteServices);


router.get("/website/data", getWebsiteData);


module.exports = router;