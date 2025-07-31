import os
import json
import logging
from flask import Flask, render_template, request, jsonify
from browser_use import BrowserUse, BrowserUseError
from alibabacloud_bailian20230601.client import Client as BailianClient
from alibabacloud_tea_openapi import models as open_api_models
from alibabacloud_bailian20230601 import models as bailian_models
from alibabacloud_tea_util import models as util_models

# 初始化Flask应用
app = Flask(__name__)

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 百炼大模型客户端配置
class BailianModel:
    def __init__(self, api_key, api_secret, model="qwen-plus"):
        """初始化百炼大模型客户端"""
        self.api_key = api_key
        self.api_secret = api_secret
        self.model = model
        self.client = self._create_client()

    def _create_client(self):
        """创建百炼API客户端"""
        config = open_api_models.Config(
            access_key_id=self.api_key,
            access_key_secret=self.api_secret
        )
        config.endpoint = "bailian.aliyuncs.com"
        return BailianClient(config)

    def get_browser_automation_steps(self, user_task):
        """
        调用百炼大模型生成浏览器自动化步骤
        :param user_task: 用户输入的任务描述
        :return: 结构化的操作步骤列表
        """
        # 系统提示词 - 指导模型生成符合要求的步骤
        system_prompt = """
        你是一个浏览器自动化专家，需要将用户的自然语言任务转换为Browser-Use库可执行的操作步骤。
        请分析用户需求，生成清晰、可执行的操作步骤，每个步骤必须包含：
        1. action: 操作类型（如open_url, click, fill, press, submit, wait_for_load_state等）
        2. target: 目标元素（如CSS选择器、文本、XPath等，不需要时可为空字符串）
        3. value: 操作值（如URL、输入文本、按键等，不需要时可为空字符串）
        
        输出格式必须是JSON数组，不要包含任何额外解释，例如：
        [
            {"action": "open_url", "target": "", "value": "https://www.baidu.com"},
            {"action": "wait_for_load_state", "target": "", "value": "networkidle"},
            {"action": "fill", "target": "input[name='wd']", "value": "人工智能"},
            {"action": "press", "target": "input[name='wd']", "value": "Enter"},
            {"action": "wait_for_load_state", "target": "", "value": "networkidle"}
        ]
        """
        
        try:
            # 构建请求
            chat_request = bailian_models.ChatCompletionRequest(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_task}
                ],
                temperature=0.3,  # 降低随机性，确保输出格式稳定
                max_tokens=1024
            )
            
            # 发送请求
            runtime = util_models.RuntimeOptions()
            response = self.client.chat_completion(chat_request, runtime)
            
            # 解析响应
            if response.status_code == 200 and response.body and response.body.choices:
                content = response.body.choices[0].message.content
                # 提取JSON部分
                start_idx = content.find('[')
                end_idx = content.rfind(']') + 1
                
                if start_idx == -1 or end_idx == 0:
                    raise ValueError("模型返回内容不包含有效的JSON数组")
                    
                json_content = content[start_idx:end_idx]
                steps = json.loads(json_content)
                return steps
            else:
                raise Exception(f"百炼API调用失败: {response.body}")
                
        except Exception as e:
            logger.error(f"百炼模型调用错误: {str(e)}")
            raise

# 初始化百炼模型客户端
bailian_model = BailianModel(
    api_key=os.getenv('BAILIAN_API_KEY', 'my_api_key'),
    api_secret=os.getenv('BAILIAN_API_SECRET', 'my_api_secret'),
    model='qwen-plus'
)

# 路由
@app.route('/')
def index():
    """首页路由"""
    return render_template('index.html')

@app.route('/api/execute-task', methods=['POST'])
def execute_task():
    """执行浏览器自动化任务的API"""
    data = request.json
    task = data.get('task', '')
    headless = data.get('headless', True)
    slow_mo = data.get('slow_mo', False)
    
    # 初始化返回结果
    result = {
        'success': False,
        'logs': [],
        'url': '',
        'title': '',
        'content': ''
    }
    
    try:
        if not task:
            raise ValueError("任务描述不能为空")
            
        result['logs'].append({
            'message': f'收到任务: {task}', 
            'type': 'info'
        })
        
        # 1. 调用百炼大模型生成操作步骤
        result['logs'].append({
            'message': '正在调用百炼大模型分析任务...', 
            'type': 'info'
        })
        
        steps = bailian_model.get_browser_automation_steps(task)
        result['logs'].append({
            'message': f'模型成功生成 {len(steps)} 个操作步骤', 
            'type': 'info'
        })
        
        # 2. 初始化浏览器
        browser = BrowserUse(
            headless=headless,
            slow_mo=500 if slow_mo else 0,
            timeout=30000
        )
        result['logs'].append({
            'message': '浏览器已启动', 
            'type': 'info'
        })
        
        # 3. 执行操作步骤
        for i, step in enumerate(steps, 1):
            action = step.get('action')
            target = step.get('target', '')
            value = step.get('value', '')
            
            if not action:
                result['logs'].append({
                    'message': f'步骤 {i}: 缺少操作类型，跳过', 
                    'type': 'warning'
                })
                continue
                
            result['logs'].append({
                'message': f'步骤 {i}: 执行 {action} (目标: {target}, 值: {value})', 
                'type': 'info'
            })
            
            # 执行具体操作
            try:
                if action == 'open_url':
                    browser.open(value)
                    result['url'] = value
                    
                elif action == 'click':
                    browser.click(target)
                    
                elif action == 'fill':
                    browser.fill(target, value)
                    
                elif action == 'press':
                    browser.press(target, value)
                    
                elif action == 'submit':
                    browser.click(target)
                    
                elif action == 'wait_for_load_state':
                    browser.wait_for_load_state(value)
                    # 更新页面信息
                    result['title'] = browser.get_title()
                    result['content'] = browser.get_content()[:1000]  # 限制内容长度
                    
                elif action == 'get_title':
                    result['title'] = browser.get_title()
                    
                elif action == 'get_content':
                    result['content'] = browser.get_content()[:1000]
                    
                else:
                    result['logs'].append({
                        'message': f'步骤 {i}: 不支持的操作类型 {action}', 
                        'type': 'warning'
                    })
                    
            except Exception as e:
                result['logs'].append({
                    'message': f'步骤 {i} 执行失败: {str(e)}', 
                    'type': 'warning'
                })
        
        # 4. 完成任务
        browser.close()
        result['logs'].append({
            'message': '任务执行完成', 
            'type': 'success'
        })
        result['success'] = True
        
    except Exception as e:
        error_msg = str(e)
        result['logs'].append({
            'message': f'执行失败: {error_msg}', 
            'type': 'error'
        })
        logger.error(f'任务执行错误: {error_msg}')
        
    return jsonify(result)

if __name__ == '__main__':
    # 确保static和templates目录存在
    os.makedirs('static/js', exist_ok=True)
    os.makedirs('templates', exist_ok=True)
    app.run(debug=True, host='0.0.0.0', port=5000)
    