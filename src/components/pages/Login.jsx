import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Eye, EyeOff, LogIn, UserPlus } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'


const Login = () => {
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    confirmPassword: ''
  })
  
  const { signIn, signUp, loading, error, clearError } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    clearError()

    if (!isLogin) {
      // Validações para cadastro
      if (formData.password !== formData.confirmPassword) {
        return
      }
      
      if (formData.password.length < 6) {
        return
      }
      
      await signUp(formData.email, formData.password, formData.displayName)
    } else {
      // Login
      await signIn(formData.email, formData.password)
    }
  }

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const toggleMode = () => {
    setIsLogin(!isLogin)
    clearError()
    setFormData({
      email: '',
      password: '',
      displayName: '',
      confirmPassword: ''
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
         <div className="flex justify-center mb-6">
           <img 
             src="/Younv-Official.png" 
             alt="Younv" 
             className="h-16 w-auto"
             />
           </div>
          <h2 className="text-3xl font-extrabold text-gray-900">
            Younv Clinical CRM
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {isLogin ? 'Entre na sua conta' : 'Crie sua conta'}
          </p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-center">
              {isLogin ? (
                <>
                  <LogIn className="h-5 w-5 mr-2" />
                  Entrar
                </>
              ) : (
                <>
                  <UserPlus className="h-5 w-5 mr-2" />
                  Cadastrar
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <Label htmlFor="displayName">Nome Completo</Label>
                  <Input
                    id="displayName"
                    name="displayName"
                    type="text"
                    value={formData.displayName}
                    onChange={handleInputChange}
                    required={!isLogin}
                    placeholder="Seu nome completo"
                  />
                </div>
              )}
              
              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  placeholder="seu@email.com"
                />
              </div>
              
              <div>
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    placeholder="Sua senha"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              
              {!isLogin && (
                <div>
                  <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required={!isLogin}
                    placeholder="Confirme sua senha"
                  />
                  {formData.password !== formData.confirmPassword && formData.confirmPassword && (
                    <p className="text-sm text-red-600 mt-1">As senhas não coincidem</p>
                  )}
                </div>
              )}
              
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <Button
                type="submit"
                className="w-full"
                disabled={loading || (!isLogin && formData.password !== formData.confirmPassword)}
              >
                {loading ? 'Carregando...' : (isLogin ? 'Entrar' : 'Cadastrar')}
              </Button>
            </form>
            
            <div className="mt-4 text-center">
              <Button
                type="button"
                variant="link"
                onClick={toggleMode}
                className="text-sm"
              >
                {isLogin 
                  ? 'Não tem uma conta? Cadastre-se' 
                  : 'Já tem uma conta? Entre'
                }
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <div className="text-center">
          <p className="text-xs text-gray-500">
            Sistema de CRM para clínicas médicas
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
