// DOM元素
const taskInput = document.getElementById('task-input');
const executeTaskBtn = document.getElementById('execute-task');
const resetAllBtn = document.getElementById('reset-all');
const taskHistory = document.getElementById('task-history');
const browserContent = document.getElementById('browser-content');
const browserUrl = document.getElementById('browser-url');
const consoleOutput = document.getElementById('console-output');
const clearLogBtn = document.getElementById('clear-log');
const downloadLogBtn = document.getElementById('download-log');
const helpButton = document.getElementById('help-button');
const helpModal = document.getElementById('help-modal');
const closeHelpBtn = document.getElementById('close-help');
const gotItBtn = document.getElementById('got-it');
const headlessMode = document.getElementById('headless-mode');
const slowMode = document.getElementById('slow-mode');
const refreshBrowserBtn = document.getElementById('refresh-browser');
const screenshotBtn = document.getElementById('screenshot-btn');
const themeToggle = document.getElementById('theme-toggle');

// 任务历史记录
let history = [];

// 日志记录函数
function log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    let logClass = 'text-gray-300';
    
    if (type === 'success') logClass = 'text-green-400';
    else if (type === 'error') logClass = 'text-red-400';
    else if (type === 'warning') logClass = 'text-yellow-400';
    else if (type === 'info') logClass = 'text-blue-400';
    
    const logElement = document.createElement('div');
    logElement.className = `flex items-start mb-1 ${logClass}`;
    logElement.innerHTML = `
        <span class="text-gray-500 mr-2 text-xs">${timestamp}</span>
        <span>${message}</span>
    `;
    
    consoleOutput.appendChild(logElement);
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

// 更新任务历史
function updateHistory() {
    taskHistory.innerHTML = '';
    
    if (history.length === 0) {
        taskHistory.innerHTML = '<div class="text-xs text-gray-500 italic text-center py-3">暂无历史记录</div>';
        return;
    }
    
    history.forEach((task, index) => {
        const historyItem = document.createElement('div');
        historyItem.className = 'bg-white rounded p-2 shadow-sm hover:shadow transition-shadow cursor-pointer';
        historyItem.innerHTML = `
            <div class="flex justify-between items-center">
                <span class="text-sm font-medium">${task.name}</span>
                <span class="text-xs text-gray-500">${new Date(task.timestamp).toLocaleTimeString()}</span>
            </div>
            <div class="text-xs text-gray-500 mt-1">
                ${task.status === 'completed' ? '<span class="text-green-500"><i class="fa fa-check-circle"></i> 已完成</span>' : 
                  task.status === 'running' ? '<span class="text-blue-500 animate-pulse"><i class="fa fa-spinner fa-spin"></i> 运行中</span>' : 
                  '<span class="text-red-500"><i class="fa fa-times-circle"></i> 失败</span>'}
            </div>
        `;
        
        historyItem.addEventListener('click', () => {
            taskInput.value = task.name;
        });
        
        taskHistory.appendChild(historyItem);
    });
}

// 执行实际任务
async function executeTask() {
    const task = taskInput.value.trim();
    
    if (!task) {
        log('请输入任务描述', 'error');
        return;
    }
    
    // 添加到历史记录
    history.unshift({
        name: task,
        timestamp: Date.now(),
        status: 'running'
    });
    
    updateHistory();
    log(`开始执行任务: ${task}`, 'info');
    
    // 清空浏览器内容并显示加载状态
    browserContent.innerHTML = `
        <div class="text-center">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3"></div>
            <p class="text-gray-500">正在调用百炼大模型分析任务并执行...</p>
        </div>
    `;
    
    try {
        // 发送请求到后端API
        const response = await fetch('/api/execute-task', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                task: task,
                headless: headlessMode.checked,
                slow_mo: slowMode.checked
            })
        });
        
        const data = await response.json();
        
        // 显示所有日志
        data.logs.forEach(logEntry => {
            log(logEntry.message, logEntry.type);
        });
        
        if (!data.success) {
            throw new Error('任务执行失败，请查看日志获取详细信息');
        }
        
        // 更新浏览器内容
        browserUrl.textContent = data.url || 'https://www.example.com';
        
        // 根据内容类型显示不同的页面
        if (data.content.includes('搜索结果') || task.includes('搜索') || task.includes('查找')) {
            // 搜索结果页面
            browserContent.innerHTML = `
                <div class="bg-white rounded-lg shadow p-4 max-w-2xl mx-auto">
                    <h2 class="text-xl font-semibold mb-2">搜索结果: ${task.replace(/.*(搜索|查找)/, '').trim()}</h2>
                    <div class="text-sm text-gray-500 mb-4">约有1,234个结果</div>
                    
                    <div class="space-y-4">
                        <div class="border-b border-gray-100 pb-4">
                            <a href="#" class="text-primary hover:text-primary/80 font-medium">相关搜索结果</a>
                            <div class="text-green-600 text-sm">${data.url}</div>
                            <p class="text-sm text-gray-600 mt-1">${data.content.substring(0, 200)}...</p>
                        </div>
                        <div class="border-b border-gray-100 pb-4">
                            <a href="#" class="text-primary hover:text-primary/80 font-medium">相关资源链接</a>
                            <div class="text-green-600 text-sm">https://example.com/resource</div>
                            <p class="text-sm text-gray-600 mt-1">这是与搜索内容相关的资源页面，包含详细信息和下载链接...</p>
                        </div>
                    </div>
                </div>
            `;
        } else if (data.content.includes('登录') || task.includes('登录')) {
            // 登录结果页面
            browserContent.innerHTML = `
                <div class="bg-white rounded-lg shadow-md p-6 max-w-md mx-auto text-center">
                    <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i class="fa fa-check text-green-500 text-2xl"></i>
                    </div>
                    <h2 class="text-xl font-semibold mb-2">登录成功</h2>
                    <p class="text-gray-600 mb-4">已成功使用Browser-Use自动化登录到目标网站</p>
                    <div class="bg-gray-50 rounded-lg p-4 text-left">
                        <p class="text-sm text-gray-700">页面标题: ${data.title || '用户中心'}</p>
                        <p class="text-sm text-gray-700 mt-1">登录时间: ${new Date().toLocaleString()}</p>
                    </div>
                </div>
            `;
        } else {
            // 通用页面
            browserContent.innerHTML = `
                <div class="bg-white rounded-lg shadow-md p-6 max-w-4xl mx-auto">
                    <h2 class="text-2xl font-bold mb-4">${data.title || '网页内容'}</h2>
                    <div class="text-gray-700 mb-6">
                        <p>这是使用Browser-Use自动化访问的网页内容。</p>
                        <p class="mt-2">URL: ${data.url}</p>
                    </div>
                    
                    <div class="bg-gray-50 rounded-lg p-4">
                        <p class="text-sm text-gray-700">页面内容预览:</p>
                        <div class="mt-2 text-sm text-gray-600">
                            ${data.content || '页面内容已成功加载'}
                        </div>
                    </div>
                </div>
            `;
        }
        
        // 更新任务状态
        history[0].status = 'completed';
        updateHistory();
        
    } catch (error) {
        log(`错误: ${error.message}`, 'error');
        
        // 更新任务状态
        history[0].status = 'failed';
        updateHistory();
        
        // 显示错误页面
        browserContent.innerHTML = `
            <div class="bg-white rounded-lg shadow-md p-6 max-w-md mx-auto text-center">
                <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i class="fa fa-exclamation-triangle text-red-500 text-2xl"></i>
                </div>
                <h2 class="text-xl font-semibold mb-2">执行任务失败</h2>
                <p class="text-gray-600 mb-4">${error.message}</p>
                <button id="retry-task" class="bg-primary hover:bg-primary/90 text-white font-medium py-2 px-4 rounded-lg transition-all">
                    重试任务
                </button>
            </div>
        `;
        
        // 添加重试按钮事件
        document.getElementById('retry-task').addEventListener('click', executeTask);
    }
}

// 清空日志
function clearLog() {
    consoleOutput.innerHTML = '<div class="text-gray-400">=== 控制台日志 ===</div>';
}

// 下载日志
function downloadLog() {
    const content = Array.from(consoleOutput.children)
        .map(el => el.textContent)
        .join('\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `browser-use-log-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
    a.click();
}

// 显示帮助模态框
function showHelpModal() {
    helpModal.classList.remove('hidden');
    helpModal.classList.add('flex');
}

// 隐藏帮助模态框
function hideHelpModal() {
    helpModal.classList.add('hidden');
    helpModal.classList.remove('flex');
}

// 重置所有
function resetAll() {
    taskInput.value = '';
    clearLog();
    browserContent.innerHTML = `
        <div class="text-center">
            <i class="fa fa-chrome text-gray-300 text-5xl mb-3"></i>
            <p class="text-gray-400">等待执行任务...</p>
        </div>
    `;
    browserUrl.textContent = 'https://www.example.com';
}

// 刷新浏览器
function refreshBrowser() {
    const currentUrl = browserUrl.textContent;
    log(`正在刷新页面: ${currentUrl}`, 'info');
    
    browserContent.innerHTML = `
        <div class="text-center">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3"></div>
            <p class="text-gray-500">正在刷新...</p>
        </div>
    `;
    
    // 模拟刷新
    setTimeout(() => {
        log('页面已刷新', 'info');
        // 恢复原来的内容
        browserContent.innerHTML = `
            <div class="bg-white rounded-lg shadow-md p-6 max-w-4xl mx-auto">
                <h2 class="text-2xl font-bold mb-4">页面已刷新</h2>
                <div class="text-gray-700 mb-6">
                    <p>URL: ${currentUrl}</p>
                    <p class="mt-2">刷新时间: ${new Date().toLocaleString()}</p>
                </div>
            </div>
        `;
    }, 1500);
}

// 模拟截图
function takeScreenshot() {
    log('正在截取当前页面...', 'info');
    
    setTimeout(() => {
        log('截图成功', 'success');
        
        // 显示截图预览
        browserContent.innerHTML = `
            <div class="bg-white rounded-lg shadow-md p-4 max-w-3xl mx-auto">
                <h3 class="font-semibold mb-3">截图预览</h3>
                <div class="bg-gray-100 rounded-lg p-2 flex justify-center">
                    <img src="https://picsum.photos/800/400?random=${Math.random()}" alt="浏览器截图" class="max-w-full rounded shadow">
                </div>
                <div class="mt-3 flex justify-end">
                    <button class="text-sm bg-primary hover:bg-primary/90 text-white py-1 px-3 rounded transition-colors">
                        下载截图
                    </button>
                </div>
            </div>
        `;
    }, 1000);
}

// 切换主题
function toggleTheme() {
    const icon = themeToggle.querySelector('i');
    if (icon.classList.contains('fa-moon-o')) {
        icon.classList.remove('fa-moon-o');
        icon.classList.add('fa-sun-o');
        document.body.classList.add('bg-gray-800', 'text-white');
        document.body.classList.remove('bg-gray-50', 'text-dark');
        log('已切换到深色模式', 'info');
    } else {
        icon.classList.remove('fa-sun-o');
        icon.classList.add('fa-moon-o');
        document.body.classList.remove('bg-gray-800', 'text-white');
        document.body.classList.add('bg-gray-50', 'text-dark');
        log('已切换到浅色模式', 'info');
    }
}

// 事件监听
executeTaskBtn.addEventListener('click', executeTask);
resetAllBtn.addEventListener('click', resetAll);
clearLogBtn.addEventListener('click', clearLog);
downloadLogBtn.addEventListener('click', downloadLog);
helpButton.addEventListener('click', showHelpModal);
closeHelpBtn.addEventListener('click', hideHelpModal);
gotItBtn.addEventListener('click', hideHelpModal);
refreshBrowserBtn.addEventListener('click', refreshBrowser);
screenshotBtn.addEventListener('click', takeScreenshot);
themeToggle.addEventListener('click', toggleTheme);

// 初始化
updateHistory();
log('欢迎使用Browser-Use + 百炼大模型自动化工具', 'info');
log('请在左侧输入任务描述，然后点击"执行任务"按钮', 'info');
log('提示: 输入"在百度搜索人工智能"或"登录GitHub"等任务描述', 'info');
    