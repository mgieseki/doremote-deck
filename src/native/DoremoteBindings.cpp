#include <napi.h>
#include <windows.h>
#include <string>
#include <vector>

using doremote_handle = void*;

struct DoricoAppInfo {
    char number[16];
    char variant[16];
};

static std::wstring utf8_to_wide (const std::string &str) {
    if (str.empty())
        return L"";
    int len = MultiByteToWideChar(CP_UTF8, 0, str.c_str(), (int)str.size(), nullptr, 0);
    std::wstring out(len, L'\0');
    MultiByteToWideChar(CP_UTF8, 0, str.c_str(), (int)str.size(), out.data(), len);
    return out;
}

static std::string to_string (const char *cstr) {
    return cstr ? std::string(cstr) : std::string();
}

static std::string to_string (const char *buf, size_t n) {
    size_t i = 0;
    while (i < n && buf[i] != '\0')
        i++;
    return std::string(buf, buf+i);
}

class DoremoteBindings : public Napi::ObjectWrap<DoremoteBindings> {
    public:
        static Napi::Object init(Napi::Env env, Napi::Object exports) {
            Napi::Function ctor = DefineClass(env, "DoremoteBindings", {
                InstanceMethod("connect", &DoremoteBindings::connect),
                InstanceMethod("reconnect", &DoremoteBindings::reconnect),
                InstanceMethod("disconnect", &DoremoteBindings::disconnect),
                InstanceMethod("sendCommand", &DoremoteBindings::sendCommand),
                InstanceMethod("isServiceUp", &DoremoteBindings::isServiceUp),
                InstanceMethod("sessionToken", &DoremoteBindings::sessionToken),
                InstanceMethod("getAppInfo", &DoremoteBindings::getAppInfo),
            });
            exports.Set("DoremoteBindings", ctor);
            return exports;
        }

        DoremoteBindings (const Napi::CallbackInfo &info) : Napi::ObjectWrap<DoremoteBindings>(info) {
            Napi::Env env = info.Env();
            if (info.Length() < 1 || !info[0].IsString()) {
                Napi::TypeError::New(env, "Expected dllPath string").ThrowAsJavaScriptException();
                return;
            }
            std::string dllPathUtf8 = info[0].As<Napi::String>().Utf8Value();
            dll_ = LoadLibraryW(utf8_to_wide(dllPathUtf8).c_str());
            if (!dll_) {
                Napi::Error::New(env, "LoadLibrary failed").ThrowAsJavaScriptException();
                return;
            }
            create_instance_ = (create_instance_t)GetProcAddress(dll_, "doremote_create_instance");
            destroy_instance_ = (destroy_instance_t)GetProcAddress(dll_, "doremote_destroy_instance");
            connect_ = (connect_t)GetProcAddress(dll_, "doremote_connect");
            reconnect_ = (reconnect_t)GetProcAddress(dll_, "doremote_reconnect");
            disconnect_ = (disconnect_t)GetProcAddress(dll_, "doremote_disconnect");
            send_command_ = (send_command_t)GetProcAddress(dll_, "doremote_send_command");
            session_token_ = (session_token_t)GetProcAddress(dll_, "doremote_session_token");
            get_app_info_ = (get_app_info_t)GetProcAddress(dll_, "doremote_get_app_info");
            is_connected_ = (is_connected_t)GetProcAddress(dll_, "doremote_is_connected");
            if (!create_instance_ || !destroy_instance_ || !connect_ || !reconnect_ || !disconnect_ ||
                    !send_command_ || !session_token_ || !get_app_info_ || !is_connected_) {
                Napi::Error::New(env, "GetProcAddress failed").ThrowAsJavaScriptException();
                return;
            }
            handle_ = create_instance_();
            if (!handle_)
                Napi::Error::New(env, "doremote_create_instance returned NULL").ThrowAsJavaScriptException();
        }

        ~DoremoteBindings () {
            if (handle_ && destroy_instance_) {
                destroy_instance_(handle_);
                handle_ = nullptr;
            }
            if (dll_) {
                FreeLibrary(dll_);
                dll_ = nullptr;
            }
        }

    private:
        using create_instance_t = doremote_handle (*)();
        using destroy_instance_t = void (*)(doremote_handle);
        using connect_t = int (*)(doremote_handle, const char*, const char*, const char*);
        using reconnect_t = int (*)(doremote_handle, const char*, const char*, const char*, const char*);
        using disconnect_t = void (*)(doremote_handle);
        using send_command_t = int (*)(doremote_handle, const char*);
        using session_token_t = const char* (*)(doremote_handle);
        using get_app_info_t = void (*)(doremote_handle, DoricoAppInfo*);
        using is_connected_t = int (*)(doremote_handle);

        HMODULE dll_ = nullptr;
        doremote_handle handle_ = nullptr;

        create_instance_t create_instance_ = nullptr;
        destroy_instance_t destroy_instance_ = nullptr;
        connect_t connect_ = nullptr;
        reconnect_t reconnect_ = nullptr;
        disconnect_t disconnect_ = nullptr;
        send_command_t send_command_ = nullptr;
        session_token_t session_token_ = nullptr;
        get_app_info_t get_app_info_ = nullptr;
        is_connected_t is_connected_ = nullptr;

        Napi::Value connect (const Napi::CallbackInfo &info) {
            auto env = info.Env();
            if (info.Length() < 3) {
                Napi::TypeError::New(env, "connect(name, host, port)").ThrowAsJavaScriptException();
                return env.Null();
            }
            std::string name = info[0].As<Napi::String>().Utf8Value();
            std::string host = info[1].As<Napi::String>().Utf8Value();
            std::string port = info[2].As<Napi::String>().Utf8Value();
            int rc = connect_(handle_, name.c_str(), host.c_str(), port.c_str());
            return Napi::Number::New(env, rc);
        }

        Napi::Value reconnect (const Napi::CallbackInfo &info) {
            auto env = info.Env();
            if (info.Length() < 4) {
                Napi::TypeError::New(env, "reconnect(name, host, port, token)").ThrowAsJavaScriptException();
                return env.Null();
            }
            std::string name = info[0].As<Napi::String>().Utf8Value();
            std::string host = info[1].As<Napi::String>().Utf8Value();
            std::string port = info[2].As<Napi::String>().Utf8Value();
            std::string token = info[3].As<Napi::String>().Utf8Value();
            int rc = reconnect_(handle_, name.c_str(), host.c_str(), port.c_str(), token.c_str());
            return Napi::Number::New(env, rc);
        }

        Napi::Value disconnect (const Napi::CallbackInfo &info) {
            disconnect_(handle_);
            return info.Env().Undefined();
        }

        Napi::Value sendCommand (const Napi::CallbackInfo &info) {
            auto env = info.Env();
            if (info.Length() < 1) {
                Napi::TypeError::New(env, "sendCommand(command)").ThrowAsJavaScriptException();
                return env.Null();
            }
            std::string cmd = info[0].As<Napi::String>().Utf8Value();
            int rc = send_command_(handle_, cmd.c_str());
            return Napi::Number::New(env, rc);
        }

        Napi::Value isServiceUp (const Napi::CallbackInfo &info) {
            int v = is_connected_(handle_);
            return Napi::Boolean::New(info.Env(), v != 0);
        }

        Napi::Value sessionToken (const Napi::CallbackInfo &info) {
            const char *token = session_token_(handle_);
            return token ? Napi::String::New(info.Env(), to_string(token)) : info.Env().Null();
        }

        Napi::Value getAppInfo (const Napi::CallbackInfo &info) {
            DoricoAppInfo appInfo{};
            get_app_info_(handle_, &appInfo);

            Napi::Object obj = Napi::Object::New(info.Env());
            obj.Set("number", to_string(appInfo.number, sizeof(appInfo.number)));
            obj.Set("variant", to_string(appInfo.variant, sizeof(appInfo.variant)));
            return obj;
        }
};

Napi::Object initAll(Napi::Env env, Napi::Object exports) {
    return DoremoteBindings::init(env, exports);
}

NODE_API_MODULE(doremote_bindings, initAll)
