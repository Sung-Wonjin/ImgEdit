' ImgEdit 런처 - CMD 창 없이 실행
Dim shell
Set shell = CreateObject("WScript.Shell")
Dim scriptDir
scriptDir = Left(WScript.ScriptFullName, InStrRev(WScript.ScriptFullName, "\"))
shell.Run """" & scriptDir & "start.bat"" run", 0, False
Set shell = Nothing
