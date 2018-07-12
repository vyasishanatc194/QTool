<?php

function Streams_1_0_01_Streams()
{
	$publisherId = Q::app();
	Streams::create($publisherId, $publisherId, 'Streams/image', array(
		'name' => 'Streams/image/album',
		'title' => 'User Images',
		'readLevel' => 0,
		'writeLevel' => 0,
		'adminLevel' => 0
	));
}

Streams_1_0_01_Streams();