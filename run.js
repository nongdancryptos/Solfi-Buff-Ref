const puppeteer = require('puppeteer');
const fs = require('fs');
const proxyChain = require('proxy-chain');

// Đọc file proxy và wallet
const readProxyFile = (proxyFilePath) => {
    return fs.readFileSync(proxyFilePath, 'utf8').split('\n').filter(Boolean);
}

const readWalletFile = (walletFilePath) => {
    return fs.readFileSync(walletFilePath, 'utf8').split('\n').filter(Boolean);
}

// Hàm tìm kiếm và click vào phần tử dựa trên văn bản
const clickByText = async (page, text) => {
    const element = await page.$x(`//*[contains(text(), "${text}")]`);
    if (element.length > 0) {
        await element[0].click();
        console.log(`Clicked on element with text: ${text}`);
    } else {
        console.log(`Không tìm thấy phần tử với văn bản: ${text}`);
    }
}

// Hàm thực thi với proxy
const runWithProxy = async (proxy, wallet, index) => {
    const newProxyUrl = await proxyChain.anonymizeProxy(proxy); // Mã hóa proxy
    const browser = await puppeteer.launch({
        headless: false, // Không headless để dễ theo dõi
        args: [`--proxy-server=${newProxyUrl}`],
        defaultViewport: { width: 1366, height: 768 } // Đảm bảo độ phân giải màn hình phù hợp
    });

    const page = await browser.newPage();

    try {
        console.log(`Running with proxy ${index + 1}: ${proxy} and wallet ${wallet}`);

        await page.goto('https://solfi.pro/VUOIP', { waitUntil: 'load' });

        // Chờ trang tải xong
        await page.waitForSelector('body', { timeout: 20000 }); // Chờ đến khi body tải xong

        // Chờ và click vào link "ENGLISH" với selector mới
        const englishLink = await page.$('a.lang[data-lang="en"]');
        if (englishLink) {
            await englishLink.click(); // Nếu có thì click
            console.log('Clicked on ENGLISH link.');
        } else {
            console.log("Không tìm thấy link ENGLISH, thử tìm bằng văn bản.");
            await clickByText(page, "ENGLISH"); // Tìm và click bằng văn bản
        }

        // Thêm thời gian chờ giữa các thao tác (dùng waitForSelector thay vì waitForTimeout)
        await page.waitForSelector('a.btn.btn-outline-light.btn-lg.mx-1', { timeout: 20000 }); // Chờ Airdrop button

        // Chờ và click vào nút "Airdrop" với selector mới
        const airdropLink = await page.$('a.btn.btn-outline-light.btn-lg.mx-1');
        if (airdropLink) {
            await airdropLink.click(); // Click vào nút Airdrop
            console.log('Clicked on Airdrop link.');
        } else {
            console.log("Không tìm thấy link Airdrop, thử tìm bằng văn bản.");
            await clickByText(page, "Airdrop"); // Tìm và click bằng văn bản
        }

        // Thêm thời gian chờ giữa các thao tác
        await page.waitForSelector('#airdrop-form > div > input.form-control.form-control-lg.input-light', { timeout: 10000 });

        // Chờ và điền ví vào ô input với selector mới
        await page.type('#airdrop-form > div > input.form-control.form-control-lg.input-light', wallet); // Đảm bảo đúng selector của ô ví

        // Thêm thời gian chờ giữa các thao tác
        await page.waitForSelector('#airdrop-form > div > div > button', { timeout: 20000 }); // Chờ nút Claim

        // Click vào nút Claim
        const claimButton = await page.$('#airdrop-form > div > div > button');
        if (claimButton) {
            await claimButton.click(); // Click vào nút Claim
            console.log('Claimed successfully!');
        } else {
            console.log("Không tìm thấy nút Claim, thử tìm bằng văn bản.");
            await clickByText(page, "Claim"); // Tìm và click bằng văn bản
        }

        // Thêm thời gian chờ giữa các thao tác
        await page.waitForSelector('body', { timeout: 20000 }); // Đảm bảo có kết quả từ trang web

        // Log thông báo sau khi hoàn thành một ví
        console.log(`Wallet ${index + 1} (${wallet}) has been processed successfully!`);

    } catch (error) {
        console.error('Error during automation: ', error);
    } finally {
        await browser.close();
    }
}

// Chạy với nhiều profile
const runForMultipleProfiles = async (proxyFilePath, walletFilePath) => {
    const proxies = readProxyFile(proxyFilePath);
    const wallets = readWalletFile(walletFilePath);

    // Kiểm tra nếu số lượng ví và proxy không khớp
    if (proxies.length !== wallets.length) {
        console.log("Cảnh báo: Số lượng proxy và ví không khớp, sẽ lặp lại ví nếu không đủ.");
    }

    for (let i = 0; i < proxies.length; i++) {
        const proxy = proxies[i];
        const wallet = wallets[i % wallets.length]; // Chọn wallet từ file nếu có nhiều ví

        console.log(`Processing wallet #${i + 1} with proxy #${i + 1}:`);
        await runWithProxy(proxy, wallet, i);
    }
}

// Đường dẫn tới file proxy và wallet
const proxyFilePath = 'proxy.txt';
const walletFilePath = 'wallet.txt';

runForMultipleProfiles(proxyFilePath, walletFilePath);
