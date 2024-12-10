const puppeteer = require('puppeteer');
const fs = require('fs');
const proxyChain = require('proxy-chain');
const { Keypair } = require('@solana/web3.js'); // Thêm import để tạo ví Solana

// Hàm tạo ví Solana ngẫu nhiên
const generateSolanaWallet = () => {
    const keypair = Keypair.generate(); // Tạo keypair mới
    return keypair.publicKey.toBase58(); // Trả về địa chỉ ví Solana (public key)
}

// Hàm tạo danh sách ví ngẫu nhiên
const generateWallets = (num) => {
    const wallets = [];
    for (let i = 0; i < num; i++) {
        wallets.push(generateSolanaWallet()); // Tạo ví ngẫu nhiên và thêm vào mảng
    }
    return wallets;
}

// Đọc file proxy
const readProxyFile = (proxyFilePath) => {
    return fs.readFileSync(proxyFilePath, 'utf8').split('\n').filter(Boolean);
}

// Tạo User-Agent ngẫu nhiên
const getRandomUserAgent = () => {
    const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edge/91.0.864.64',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
}

// Tạo độ phân giải màn hình ngẫu nhiên
const getRandomViewport = () => {
    const viewports = [
        { width: 1366, height: 768 },
        { width: 1920, height: 1080 },
        { width: 1280, height: 720 },
        { width: 1440, height: 900 }
    ];
    return viewports[Math.floor(Math.random() * viewports.length)];
}

// Hàm tìm kiếm và click vào phần tử dựa trên văn bản
const clickByText = async (page, text) => {
    try {
        await page.$eval(`//*[contains(text(), "${text}")]`, (el) => el.click());
        console.log(`Clicked on element with text: ${text}`);
    } catch (error) {
        console.log(`Không tìm thấy phần tử với văn bản: ${text}`);
    }
}

// Hàm tạo độ trễ ngẫu nhiên từ 1 đến 5 giây
const randomDelay = async (page) => {
    const delay = Math.floor(Math.random() * 2000) + 1000; // Delay từ 1000ms (1s) đến 5000ms (5s)
    await new Promise(resolve => setTimeout(resolve, delay)); // Thay thế waitForTimeout bằng setTimeout
}

// Hàm thực thi với proxy
const runWithProxy = async (proxy, wallet, index) => {
    const newProxyUrl = await proxyChain.anonymizeProxy(proxy); // Mã hóa proxy
    const browser = await puppeteer.launch({
        headless: false, // Không headless để dễ theo dõi
        args: [`--proxy-server=${newProxyUrl}`],
        defaultViewport: getRandomViewport(), // Đảm bảo độ phân giải màn hình ngẫu nhiên
        userDataDir: './chrome-profiles', // Thêm profile nếu cần
    });

    const page = await browser.newPage();
    
    // Thiết lập User-Agent ngẫu nhiên
    await page.setUserAgent(getRandomUserAgent());

    try {
        console.log(`Running with proxy ${index + 1}: ${proxy} and wallet ${wallet}`);

        await page.goto('https://solfi.pro/79D2K', { waitUntil: 'load' });

        // Chờ trang tải xong
        await page.waitForSelector('body', { timeout: 20000 }); // Chờ đến khi body tải xong

        // Chờ và click vào link "ENGLISH" với selector mới
        const englishLink = await page.$('a.lang[data-lang="en"]');
        if (englishLink) {
            await englishLink.click(); // Nếu có thì click
            console.log('Clicked on ENGLISH link.');
            await randomDelay(page); // Thêm thời gian chờ ngẫu nhiên
        } else {
            console.log("Không tìm thấy link ENGLISH, thử tìm bằng văn bản.");
            await clickByText(page, "ENGLISH"); // Tìm và click bằng văn bản
            await randomDelay(page); // Thêm thời gian chờ ngẫu nhiên
        }

        // Thêm thời gian chờ giữa các thao tác
        await page.waitForSelector('a.btn.btn-outline-light.btn-lg.mx-1', { timeout: 20000 }); // Chờ Airdrop button

        // Chờ và click vào nút "Airdrop" với selector mới
        const airdropLink = await page.$('a.btn.btn-outline-light.btn-lg.mx-1');
        if (airdropLink) {
            await airdropLink.click(); // Click vào nút Airdrop
            console.log('Clicked on Airdrop link.');
            await randomDelay(page); // Thêm thời gian chờ ngẫu nhiên
        } else {
            console.log("Không tìm thấy link Airdrop, thử tìm bằng văn bản.");
            await clickByText(page, "Airdrop"); // Tìm và click bằng văn bản
            await randomDelay(page); // Thêm thời gian chờ ngẫu nhiên
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
            await randomDelay(page); // Thêm thời gian chờ ngẫu nhiên
        } else {
            console.log("Không tìm thấy nút Claim, thử tìm bằng văn bản.");
            await clickByText(page, "Claim"); // Tìm và click bằng văn bản
            await randomDelay(page); // Thêm thời gian chờ ngẫu nhiên
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
const runForMultipleProfiles = async (proxyFilePath, numberOfWallets) => {
    const proxies = readProxyFile(proxyFilePath);
    const wallets = generateWallets(numberOfWallets); // Tạo ra số lượng ví ngẫu nhiên

    // Kiểm tra nếu số lượng proxy và ví không khớp
    if (proxies.length !== wallets.length) {
        console.log("Cảnh báo: Số lượng proxy và ví không khớp, sẽ lặp lại ví nếu không đủ.");
    }

    for (let i = 0; i < proxies.length; i++) {
        const proxy = proxies[i];
        const wallet = wallets[i % wallets.length]; // Chọn wallet từ file nếu có nhiều ví

        console.log(`Processing wallet #${i + 1} with proxy #${i + 1}:`);
        await runWithProxy(proxy, wallet, i); // Gọi hàm xử lý từng ví
    }
}

// Đường dẫn tới file proxy
const proxyFilePath = 'proxy.txt';

// Tạo 40 đến 60 ví ngẫu nhiên
const numberOfWallets = Math.floor(Math.random() * (60 - 40 + 1)) + 40;

// Chạy với số lượng ví ngẫu nhiên
runForMultipleProfiles(proxyFilePath, numberOfWallets);
