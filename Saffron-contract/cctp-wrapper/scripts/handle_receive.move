script {
    use 0x081e86cebf457a0c6004f35bd648a2794698f52e0dde09a48619dcd3d4cc23d9::message_transmitter;
    use 0x5f9b937419dda90aa06c1836b7847f65bbbe3f1217567758dc2488be31a477b9::token_messenger;

    fun handle_receive_message(
        caller: &signer,
        message: vector<u8>,
        attestation: vector<u8>
    ) {
        let receipt = message_transmitter::receive_message(
            caller,
            &message,
            &attestation
        );
        token_messenger::handle_receive_message(receipt);
    }
}
