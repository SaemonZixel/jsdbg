<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

$password = '123';

// CORS
header('Access-Control-Allow-Origin: '.$_SERVER['HTTP_HOST']);
header('Access-Control-Request-Method: POST,GET');
header('Access-Control-Allow-Headers: Content-Type');

// switch the mbstring to 1-byte encoding
if(ini_get('mbstring.func_overload') > 1) {
	if (version_compare(PHP_VERSION, '5.6.0') < 0)
		ini_set('mbstring.internal_encoding', 'ISO-8859-1');
	else
		mb_internal_encoding("iso-8859-1");
}

if (isset($_GET['STOR']) and !empty($_GET['password']) and $_GET['password'] == $password) {
	$filename = $_SERVER['DOCUMENT_ROOT'].$_GET['STOR'];
	$post_body = file_get_contents('php://input');
	// $post = @urldecode($post_body);

	// symlink?
	if(fileperms($filename) & 0xA040) {
		if (($result = file_put_contents($filename, $post_body)) === false)
			$result = 'ERROR: '.print_r(error_get_last(), true);
		else
			$result = 'OK! '.var_export($result, true);
	}
	elseif (($result = file_put_contents("$filename.ftp", $post_body)) === false) {
		$result = 'ERROR: '.print_r(error_get_last(), true);
		@unlink("$filename.ftp");
	}
	else {
		$result = rename("$filename.ftp", $filename);
		if ($result === false) {
			$result = 'ERROR: '.print_r(error_get_last(), true);
			@unlink("$filename.ftp");
		} else {
			$result = 'OK! '.strlen($post_body);
		}
	}

	echo $result;
}
