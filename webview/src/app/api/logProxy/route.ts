import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// 真实目标服务器地址 - 确保URL格式正确
const TARGET_URL = 'http://116.62.116.164:8091/log/get';

/**
 * 登录日志代理API
 * 专门用于转发登录日志数据到真实服务器
 */
export async function POST(request: NextRequest) {
  try {
    console.log('收到logProxy请求');
    
    // 解析请求体
    const body = await request.json();
    
    // 验证请求数据
    if (!body.encryptData) {
      console.error('缺少必要参数: encryptData');
      return NextResponse.json(
        { success: false, message: '缺少必要参数' },
        { status: 400 }
      );
    }
    
    console.log(`准备转发请求到: ${TARGET_URL}`);
    
    // 转发请求到真实目标服务器
    const response = await axios.post(TARGET_URL, {
      encryptData: body.encryptData
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('转发请求成功');
    
    // 返回真实服务器的响应
    return NextResponse.json({
      success: true,
      data: response.data
    });
  } catch (error: any) {
    console.error('登录日志转发失败:', error);
    
    // 返回错误信息
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || '登录日志转发失败',
        status: error.response?.status || 500
      },
      { status: error.response?.status || 500 }
    );
  }
} 